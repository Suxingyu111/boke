import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRoleEntity } from '@database/entities';
import { SuperAdminBootstrapService } from './super-admin-bootstrap.service';

type QueryBuilderMock = {
  addSelect: jest.Mock;
  where: jest.Mock;
  orWhere: jest.Mock;
  orderBy: jest.Mock;
  getOne: jest.Mock;
};

type UserRepositoryMock = {
  create: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock<QueryBuilderMock, [string]>;
};

type UserRoleRepositoryMock = {
  create: jest.Mock;
  save: jest.Mock;
};

const createUserRepositoryMock = (): UserRepositoryMock => {
  const users: User[] = [];

  return {
    create: jest.fn().mockImplementation((payload: Partial<User>) => ({
      id: payload.id ?? 'user-1',
      username: payload.username ?? '',
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      password: payload.password ?? '',
      nickname: payload.nickname ?? null,
      registrationType: payload.registrationType ?? 'email',
      emailVerifiedAt: payload.emailVerifiedAt ?? null,
      phoneVerifiedAt: payload.phoneVerifiedAt ?? null,
      avatar: payload.avatar ?? null,
      bio: payload.bio ?? null,
      isActive: payload.isActive ?? true,
      role: payload.role ?? 'user',
      lastLoginAt: payload.lastLoginAt ?? null,
      passwordChangedAt: payload.passwordChangedAt ?? null,
      createdAt: payload.createdAt ?? new Date(),
      updatedAt: payload.updatedAt ?? new Date(),
    })),
    save: jest.fn().mockImplementation(async (user: User | User[]) => {
      if (Array.isArray(user)) {
        return user;
      }

      const index = users.findIndex(item => item.id === user.id);
      if (index >= 0) {
        users[index] = user;
      } else {
        users.push(user);
      }
      return user;
    }),
    createQueryBuilder: jest.fn().mockImplementation(() => {
      const state: { username?: string; email?: string } = {};
      const builder: QueryBuilderMock = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation((_sql: string, params: { username: string }) => {
          state.username = params.username;
          return builder;
        }),
        orWhere: jest.fn().mockImplementation((_sql: string, params: { email: string }) => {
          state.email = params.email;
          return builder;
        }),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockImplementation(async () => {
          return (
            users.find(
              user => user.username === state.username || (state.email ? user.email === state.email : false),
            ) ?? null
          );
        }),
      };
      return builder;
    }),
  };
};

const createUserRoleRepositoryMock = (): UserRoleRepositoryMock => ({
  create: jest.fn().mockImplementation((payload: Partial<UserRoleEntity>) => payload),
  save: jest.fn().mockImplementation(async (payload: unknown) => payload),
});

describe('SuperAdminBootstrapService', () => {
  let service: SuperAdminBootstrapService;
  let userRepository: UserRepositoryMock;
  let userRoleRepository: UserRoleRepositoryMock;
  let configValues: Record<string, string | undefined>;

  beforeEach(async () => {
    userRepository = createUserRepositoryMock();
    userRoleRepository = createUserRoleRepositoryMock();
    configValues = {
      'superAdmin.username': 'rootmaster',
      'superAdmin.password': 'change_me_super_admin_password_strong',
      'superAdmin.email': 'root@example.com',
      'superAdmin.nickname': '系统超管',
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminBootstrapService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(UserRoleEntity),
          useValue: userRoleRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => configValues[key]),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(SuperAdminBootstrapService);
  });

  it('应在缺少超级管理员时创建配置中的超管账号', async () => {
    await service.onApplicationBootstrap();

    expect(userRoleRepository.save).toHaveBeenCalled();
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'rootmaster',
        email: 'root@example.com',
        role: 'super_admin',
        isActive: true,
      }),
    );
  });

  it('应将已有用户升级并同步为超级管理员', async () => {
    const hashed = await bcrypt.hash('old-password-value', 10);
    await userRepository.save({
      id: 'existing-user',
      username: 'legacy-admin',
      email: 'root@example.com',
      phone: null,
      password: hashed,
      nickname: '旧昵称',
      registrationType: 'email',
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      avatar: null,
      bio: null,
      isActive: false,
      role: 'admin',
      lastLoginAt: null,
      passwordChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User);

    await service.onApplicationBootstrap();

    const savedUser = userRepository.save.mock.calls.at(-1)?.[0] as User;
    expect(savedUser.username).toBe('rootmaster');
    expect(savedUser.role).toBe('super_admin');
    expect(savedUser.isActive).toBe(true);
    expect(await bcrypt.compare('change_me_super_admin_password_strong', savedUser.password)).toBe(
      true,
    );
  });

  it('缺少超管邮箱配置时应自动生成兜底邮箱', async () => {
    configValues['superAdmin.email'] = undefined;

    await service.onApplicationBootstrap();

    const savedUser = userRepository.save.mock.calls.at(-1)?.[0] as User;
    expect(savedUser.email).toBe('rootmaster@local.admin');
  });
});
