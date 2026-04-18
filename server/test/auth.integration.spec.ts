import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';

type QueryBuilderMock = {
  addSelect: jest.Mock;
  where: jest.Mock;
  getOne: jest.Mock;
};

type UserRepositoryMock = Partial<Repository<User>> & {
  createQueryBuilder: jest.Mock<QueryBuilderMock, [string]>;
};

const createUserRepositoryMock = (): UserRepositoryMock => {
  const users: User[] = [];

  const findOne = jest.fn().mockImplementation(async ({ where }: { where: Partial<User> }) => {
    return (
      users.find(user =>
        Object.entries(where).every(([key, value]) => user[key as keyof User] === value),
      ) ?? null
    );
  });

  const create = jest.fn().mockImplementation((payload: Partial<User>) => ({
    id: payload.id ?? `user-${users.length + 1}`,
    username: payload.username ?? '',
    email: payload.email ?? '',
    password: payload.password ?? '',
    nickname: payload.nickname ?? null,
    avatar: payload.avatar ?? null,
    bio: payload.bio ?? null,
    isActive: payload.isActive ?? true,
    role: payload.role ?? 'user',
    lastLoginAt: payload.lastLoginAt ?? null,
    createdAt: payload.createdAt ?? new Date('2026-04-15T00:00:00.000Z'),
    updatedAt: payload.updatedAt ?? new Date('2026-04-15T00:00:00.000Z'),
  }));

  const save = jest.fn().mockImplementation(async (user: User) => {
    const duplicatedUser = users.find(
      current => current.email === user.email || current.username === user.username,
    );

    if (duplicatedUser) {
      throw { code: 'ER_DUP_ENTRY' };
    }

    users.push(user);
    return user;
  });

  const update = jest.fn().mockImplementation(async (id: string, payload: Partial<User>) => {
    const targetUser = users.find(user => user.id === id);
    if (!targetUser) {
      return { affected: 0, raw: {}, generatedMaps: [] };
    }

    Object.assign(targetUser, payload);
    return { affected: 1, raw: {}, generatedMaps: [] };
  });

  const createQueryBuilder = jest.fn().mockImplementation(() => {
    const state: { account?: string; email?: string } = {};

    const builder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest
        .fn()
        .mockImplementation((_query: string, params: { account: string; email: string }) => {
          state.account = params.account;
          state.email = params.email;
          return builder;
        }),
      getOne: jest.fn().mockImplementation(async () => {
        return (
          users.find(
            user => user.username === state.account || user.email.toLowerCase() === state.email,
          ) ?? null
        );
      }),
    };

    return builder as QueryBuilderMock;
  });

  return {
    findOne,
    create,
    save,
    update,
    createQueryBuilder,
  };
};

describe('Auth integration', () => {
  let app: INestApplication;
  let userRepository: UserRepositoryMock;

  beforeAll(async () => {
    userRepository = createUserRepositoryMock();

    const configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'jwt.secret') {
          return 'integration-test-secret';
        }

        if (key === 'jwt.expiresIn') {
          return '1h';
        }

        return defaultValue;
      }),
    } as unknown as ConfigService;

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'integration-test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        RolesGuard,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('注册成功后应能使用 accessToken 访问当前用户接口', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'integration_user',
        email: 'integration-user@example.com',
        password: 'SecurePass123',
        nickname: '集成用户',
      })
      .expect(201);

    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
      }),
    );
    expect(registerResponse.body.data.user).not.toHaveProperty('password');

    const meResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerResponse.body.data.accessToken}`)
      .expect(200);

    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data).toEqual(
      expect.objectContaining({
        username: 'integration_user',
        email: 'integration-user@example.com',
        role: 'user',
      }),
    );
    expect(meResponse.body.data).not.toHaveProperty('password');
  });

  it('未携带 token 访问当前用户接口时应返回 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/auth/me').expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(401);
  });

  it('无效 token 访问当前用户接口时应返回 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(401);
  });

  it('用户被禁用后使用既有 token 访问当前用户接口时应返回 403', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'disabled_user',
        email: 'disabled-user@example.com',
        password: 'SecurePass123',
        nickname: '禁用用户',
      })
      .expect(201);

    await userRepository.update?.(registerResponse.body.data.user.id, {
      isActive: false,
    });

    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerResponse.body.data.accessToken}`)
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('账号已被禁用');
  });

  it('普通用户访问后台接口时应返回 403', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        account: 'integration-user@example.com',
        password: 'SecurePass123',
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/auth/admin/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('无权访问后台资源');
  });

  it('admin 用户访问后台接口时应返回 200', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'admin_user',
        email: 'admin-user@example.com',
        password: 'SecurePass123',
        nickname: '后台用户',
      })
      .expect(201);

    await userRepository.update?.(registerResponse.body.data.user.id, { role: 'admin' });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        account: 'admin-user@example.com',
        password: 'SecurePass123',
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/auth/admin/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        username: 'admin_user',
        email: 'admin-user@example.com',
        role: 'admin',
      }),
    );
  });
});
