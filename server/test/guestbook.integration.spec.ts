import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { Guestbook, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { AdminGuestbookController } from '../src/modules/guestbook/admin-guestbook.controller';
import { PublicGuestbookController } from '../src/modules/guestbook/public-guestbook.controller';
import { GuestbookService } from '../src/modules/guestbook/guestbook.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createMockUuid = (index: number): string =>
  `40000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;

const matchWhere = <T extends Record<string, unknown>>(
  item: T,
  where?: Partial<T> | Array<Partial<T>>,
): boolean => {
  if (!where) {
    return true;
  }

  const conditions = Array.isArray(where) ? where : [where];

  return conditions.some(condition =>
    Object.entries(condition).every(([key, expectedValue]) => item[key] === expectedValue),
  );
};

const applyOrder = <T extends Record<string, unknown>>(
  items: T[],
  order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>,
): T[] => {
  if (!order) {
    return items;
  }

  const orderEntries = Object.entries(order) as Array<[keyof T, 'ASC' | 'DESC']>;

  return [...items].sort((left, right) => {
    for (const [field, direction] of orderEntries) {
      const leftValue = left[field] as string | number | boolean | Date | null;
      const rightValue = right[field] as string | number | boolean | Date | null;

      if (leftValue === rightValue) {
        continue;
      }

      if (leftValue === null || leftValue === undefined) {
        return 1;
      }

      if (rightValue === null || rightValue === undefined) {
        return -1;
      }

      const leftComparable =
        leftValue instanceof Date
          ? leftValue.getTime()
          : typeof leftValue === 'boolean'
            ? Number(leftValue)
            : leftValue;
      const rightComparable =
        rightValue instanceof Date
          ? rightValue.getTime()
          : typeof rightValue === 'boolean'
            ? Number(rightValue)
            : rightValue;

      if (leftComparable < rightComparable) {
        return direction === 'ASC' ? -1 : 1;
      }

      if (leftComparable > rightComparable) {
        return direction === 'ASC' ? 1 : -1;
      }
    }

    return 0;
  });
};

const createRepositoryMock = <T extends ObjectLiteral>(seed: T[] = []): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: (payload as { id?: string }).id ?? createMockUuid(items.length + 1),
    })),
    findAndCount: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
        skip?: number;
        take?: number;
      }) => {
        const matched = applyOrder(
          items.filter(item => matchWhere(item as Record<string, unknown>, options?.where)),
          options?.order,
        );
        const skip = options?.skip ?? 0;
        const take = options?.take ?? matched.length;

        return [matched.slice(skip, skip + take), matched.length];
      },
    ),
    findOne: jest.fn().mockImplementation(
      async (options: { where?: Partial<T> | Array<Partial<T>> }) => {
        return (
          items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null
        );
      },
    ),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const incoming = entity as T & { id?: string; createdAt?: Date };
      const now = new Date('2026-04-20T13:00:00.000Z');
      const index =
        incoming.id !== undefined && incoming.id !== null
          ? items.findIndex(item => (item as { id?: string }).id === incoming.id)
          : -1;

      if (index >= 0) {
        const updatedEntity = cloneValue({
          ...items[index],
          ...incoming,
        });
        items[index] = updatedEntity;
        return updatedEntity;
      }

      const savedEntity = cloneValue({
        ...incoming,
        id: incoming.id ?? createMockUuid(items.length + 1),
        createdAt: incoming.createdAt ?? now,
      });
      items.push(savedEntity);
      return savedEntity;
    }),
    delete: jest.fn().mockImplementation(async (criteria: Partial<T> | string) => {
      const normalizedCriteria =
        typeof criteria === 'string'
          ? ({ id: criteria } as unknown as Partial<T>)
          : criteria;
      const targets = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => matchWhere(item as Record<string, unknown>, normalizedCriteria));

      targets
        .map(target => target.index)
        .sort((left, right) => right - left)
        .forEach(index => {
          items.splice(index, 1);
        });

      return { affected: targets.length, raw: {} };
    }),
  };
};

const now = new Date('2026-04-20T09:30:00.000Z');

const makeGuestbook = (overrides: Partial<Guestbook> = {}): Guestbook => ({
  id: '40000000-0000-4000-8000-000000000001',
  nickname: '访客甲',
  email: 'reader@example.com',
  website: 'https://example.com',
  avatarUrl: null,
  content: '第一条留言',
  parentId: null,
  ip: '127.0.0.1',
  status: 'approved',
  isAdminReply: false,
  createdAt: now,
  ...overrides,
});

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: User;
    }>();

    const role = request.headers['x-test-role'];
    if (!role) {
      return false;
    }

    request.user = {
      id: request.headers['x-test-user-id'] ?? 'admin-1',
      username: request.headers['x-test-username'] ?? 'admin',
      email: request.headers['x-test-email'] ?? 'admin@example.com',
      phone: null,
      password: '',
      nickname: '管理员',
      registrationType: 'email',
      emailVerifiedAt: new Date('2026-04-18T00:00:00.000Z'),
      phoneVerifiedAt: null,
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      oauthProvider: null,
      oauthProviderId: null,
      lastLoginAt: null,
      passwordChangedAt: new Date('2026-04-18T00:00:00.000Z'),
      createdAt: now,
      updatedAt: now,
    };

    return true;
  }
}

describe('Guestbook integration', () => {
  let app: INestApplication;
  let guestbookRepository: RepositoryMock<Guestbook>;

  beforeAll(async () => {
    guestbookRepository = createRepositoryMock<Guestbook>([
      makeGuestbook({
        id: '40000000-0000-4000-8000-000000000001',
        nickname: '已审核访客',
        content: '欢迎来到博客',
        createdAt: new Date('2026-04-18T08:00:00.000Z'),
      }),
      makeGuestbook({
        id: '40000000-0000-4000-8000-000000000002',
        nickname: '博主',
        email: null,
        website: null,
        content: '谢谢来访',
        parentId: '40000000-0000-4000-8000-000000000001',
        ip: null,
        status: 'approved',
        isAdminReply: true,
        createdAt: new Date('2026-04-18T09:00:00.000Z'),
      }),
      makeGuestbook({
        id: '40000000-0000-4000-8000-000000000003',
        nickname: '待审核访客',
        content: '这条还没审核',
        status: 'pending',
        createdAt: new Date('2026-04-19T08:00:00.000Z'),
      }),
    ]);

    const moduleBuilder = Test.createTestingModule({
      controllers: [PublicGuestbookController, AdminGuestbookController],
      providers: [
        GuestbookService,
        RolesGuard,
        {
          provide: getRepositoryToken(Guestbook),
          useValue: guestbookRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new MockJwtAuthGuard());

    const moduleRef: TestingModule = await moduleBuilder.compile();

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

  it('应返回已审核留言分页结果，并对外隐藏邮箱和 IP', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/guestbook?page=1&pageSize=5')
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        total: 2,
        page: 1,
        pageSize: 5,
        totalPages: 1,
      }),
    );
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toEqual(
      expect.objectContaining({
        id: '40000000-0000-4000-8000-000000000001',
        nickname: '已审核访客',
        content: '欢迎来到博客',
      }),
    );
    expect(response.body.data.items[0].email).toBeUndefined();
    expect(response.body.data.items[0].ip).toBeUndefined();
    expect(response.body.data.items[0].replies).toHaveLength(1);
    expect(response.body.data.items[0].replies[0]).toEqual(
      expect.objectContaining({
        id: '40000000-0000-4000-8000-000000000002',
        nickname: '博主',
        isAdminReply: true,
      }),
    );
    expect(response.body.data.items[0].replies[0].email).toBeUndefined();
    expect(response.body.data.items[0].replies[0].ip).toBeUndefined();
  });

  it('应支持公开提交留言，并允许管理员审核与回复', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/guestbook')
      .set('x-forwarded-for', '198.51.100.15')
      .send({
        nickname: '  新访客  ',
        email: 'new@example.com',
        website: 'https://new.example.com',
        content: '  第一次留言，请多关照。  ',
      })
      .expect(201);

    expect(createResponse.body.data).toEqual(
      expect.objectContaining({
        nickname: '新访客',
        content: '第一次留言，请多关照。',
        message: '留言提交成功，等待审核',
      }),
    );

    const createdId = createResponse.body.data.id as string;
    const createdRecord = guestbookRepository.items.find(item => item.id === createdId);
    expect(createdRecord).toEqual(
      expect.objectContaining({
        nickname: '新访客',
        email: 'new@example.com',
        website: 'https://new.example.com',
        status: 'pending',
        ip: '198.51.100.15',
      }),
    );

    const adminListResponse = await request(app.getHttpServer())
      .get('/api/admin/guestbook?page=1&pageSize=10&status=pending')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(adminListResponse.body.data).toEqual(
      expect.objectContaining({
        total: 2,
        page: 1,
        pageSize: 10,
      }),
    );

    await request(app.getHttpServer())
      .put(`/api/admin/guestbook/${createdId}/status`)
      .set('x-test-role', 'admin')
      .send({ status: 'approved' })
      .expect(200);

    expect(guestbookRepository.items.find(item => item.id === createdId)?.status).toBe('approved');

    const replyResponse = await request(app.getHttpServer())
      .post(`/api/admin/guestbook/${createdId}/reply`)
      .set('x-test-role', 'admin')
      .send({ content: '感谢支持，欢迎常来。' })
      .expect(201);

    expect(replyResponse.body.data).toEqual(
      expect.objectContaining({
        nickname: '博主',
        parentId: createdId,
        status: 'approved',
        isAdminReply: true,
      }),
    );

    const publicResponse = await request(app.getHttpServer()).get('/api/guestbook').expect(200);
    const createdPublicEntry = publicResponse.body.data.items.find(
      (item: { id: string }) => item.id === createdId,
    );
    expect(createdPublicEntry).toBeDefined();
    expect(createdPublicEntry.replies).toHaveLength(1);
  });

  it('应拒绝普通用户访问后台留言列表，并支持删除留言', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/guestbook')
      .set('x-test-role', 'user')
      .expect(403);

    await request(app.getHttpServer())
      .delete('/api/admin/guestbook/40000000-0000-4000-8000-000000000003')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(
      guestbookRepository.items.some(
        item => item.id === '40000000-0000-4000-8000-000000000003',
      ),
    ).toBe(false);
  });
});
