import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { User, UserNotification } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { UserNotificationsController } from '../src/modules/user-notifications/user-notifications.controller';
import { UserNotificationsService } from '../src/modules/user-notifications/user-notifications.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => structuredClone(value);

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? `notification-${items.length + 1}`,
    })),
    findAndCount: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T>;
        skip?: number;
        take?: number;
      }) => {
        const filtered = items
          .filter(item =>
            Object.entries(options?.where ?? {}).every(
              ([key, value]) => item[key as keyof T] === value,
            ),
          )
          .sort((left, right) => {
            const leftTime = (left as T & { createdAt?: Date }).createdAt?.getTime() ?? 0;
            const rightTime = (right as T & { createdAt?: Date }).createdAt?.getTime() ?? 0;
            return rightTime - leftTime;
          });
        const skip = options?.skip ?? 0;
        const take = options?.take ?? filtered.length;
        return [filtered.slice(skip, skip + take), filtered.length];
      },
    ),
    count: jest.fn().mockImplementation(async (options?: { where?: Partial<T> }) => {
      return items.filter(item =>
        Object.entries(options?.where ?? {}).every(
          ([key, value]) => item[key as keyof T] === value,
        ),
      ).length;
    }),
    findOne: jest.fn().mockImplementation(async (options: { where: Partial<T> }) => {
      return (
        items.find(item =>
          Object.entries(options.where).every(([key, value]) => item[key as keyof T] === value),
        ) ?? null
      );
    }),
    save: jest.fn().mockImplementation(async (entity: T | T[]) => {
      if (Array.isArray(entity)) {
        return entity.map(item => cloneValue(item));
      }

      const index = entity.id ? items.findIndex(item => item.id === entity.id) : -1;
      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const saved = cloneValue({
        ...entity,
        id: entity.id ?? `notification-${items.length + 1}`,
        createdAt: (entity as T & { createdAt?: Date }).createdAt ?? new Date(),
      });
      items.push(saved);
      return saved;
    }),
    delete: jest.fn().mockImplementation(async (criteria: Partial<T>) => {
      const targets = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) =>
          Object.entries(criteria).every(([key, value]) => item[key as keyof T] === value),
        );

      targets
        .map(target => target.index)
        .sort((left, right) => right - left)
        .forEach(index => items.splice(index, 1));

      return { affected: targets.length, raw: {} };
    }),
    createQueryBuilder: jest.fn().mockImplementation(() => {
      const builder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation((_query: string, params?: { userId: string }) => {
          items.forEach(item => {
            if (
              item['userId' as keyof T] === params?.userId &&
              item['isRead' as keyof T] === (false as unknown as T[keyof T])
            ) {
              (item as unknown as UserNotification).isRead = true;
              (item as unknown as UserNotification).readAt = new Date('2026-04-20T14:00:00.000Z');
            }
          });
          return builder;
        }),
        execute: jest.fn().mockResolvedValue({ affected: items.length }),
      };

      return builder;
    }),
  };
};

const now = new Date('2026-04-20T13:15:00.000Z');

const makeNotification = (overrides: Partial<UserNotification> = {}): UserNotification => ({
  id: '10000000-0000-4000-8000-000000000001',
  userId: 'user-1',
  user: null as unknown as UserNotification['user'],
  type: 'system',
  title: '系统通知',
  content: '欢迎使用博客系统',
  relatedId: null,
  relatedType: null,
  isRead: false,
  readAt: null,
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
      id: request.headers['x-test-user-id'] ?? 'user-1',
      username: request.headers['x-test-username'] ?? 'member',
      email: request.headers['x-test-email'] ?? 'member@example.com',
      password: '',
      nickname: '普通用户',
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      oauthProvider: null,
      oauthProviderId: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    return true;
  }
}

describe('User notifications integration', () => {
  let app: INestApplication;
  let notificationRepository: RepositoryMock<UserNotification>;

  beforeAll(async () => {
    notificationRepository = createRepositoryMock<UserNotification>([
      makeNotification({
        id: '10000000-0000-4000-8000-000000000001',
        title: '未读系统通知',
        isRead: false,
        createdAt: new Date('2026-04-20T13:00:00.000Z'),
      }),
      makeNotification({
        id: '10000000-0000-4000-8000-000000000002',
        title: '已读点赞通知',
        type: 'like',
        isRead: true,
        readAt: new Date('2026-04-20T12:00:00.000Z'),
        createdAt: new Date('2026-04-20T12:30:00.000Z'),
      }),
      makeNotification({
        id: '10000000-0000-4000-8000-000000000003',
        userId: 'user-2',
        title: '其他用户通知',
      }),
    ]);

    const moduleBuilder = Test.createTestingModule({
      controllers: [UserNotificationsController],
      providers: [
        UserNotificationsService,
        {
          provide: getRepositoryToken(UserNotification),
          useValue: notificationRepository,
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

  it('应返回我的通知列表，并正确处理 unreadOnly=false 的查询语义', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/notifications?page=1&pageSize=10&unreadOnly=false')
      .set('x-test-role', 'user')
      .set('x-test-user-id', 'user-1')
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        unreadCount: 1,
      }),
    );
    expect(response.body.data.items).toHaveLength(2);

    const unreadOnlyResponse = await request(app.getHttpServer())
      .get('/api/notifications?unreadOnly=true')
      .set('x-test-role', 'user')
      .set('x-test-user-id', 'user-1')
      .expect(200);

    expect(unreadOnlyResponse.body.data.total).toBe(1);
    expect(unreadOnlyResponse.body.data.items[0].title).toBe('未读系统通知');
  });

  it('应返回未读数，并支持单条已读、全部已读与删除通知', async () => {
    const countResponse = await request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set('x-test-role', 'user')
      .set('x-test-user-id', 'user-1')
      .expect(200);

    expect(countResponse.body.data).toEqual({ count: 1 });

    await request(app.getHttpServer())
      .put('/api/notifications/10000000-0000-4000-8000-000000000001/read')
      .set('x-test-role', 'user')
      .set('x-test-user-id', 'user-1')
      .expect(200);

    expect(
      notificationRepository.items.find(item => item.id === '10000000-0000-4000-8000-000000000001')
        ?.isRead,
    ).toBe(true);

    await request(app.getHttpServer())
      .put('/api/notifications/read-all')
      .set('x-test-role', 'user')
      .set('x-test-user-id', 'user-1')
      .expect(200);

    expect(
      notificationRepository.items
        .filter(item => item.userId === 'user-1')
        .every(item => item.isRead),
    ).toBe(true);

    await request(app.getHttpServer())
      .delete('/api/notifications/10000000-0000-4000-8000-000000000002')
      .set('x-test-role', 'user')
      .set('x-test-user-id', 'user-1')
      .expect(200);

    expect(
      notificationRepository.items.some(
        item => item.id === '10000000-0000-4000-8000-000000000002',
      ),
    ).toBe(false);
  });

  it('应对非法查询参数返回 400，并拒绝未登录访问', async () => {
    await request(app.getHttpServer())
      .get('/api/notifications?page=abc')
      .set('x-test-role', 'user')
      .set('x-test-user-id', 'user-1')
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/notifications?unreadOnly=maybe')
      .set('x-test-role', 'user')
      .set('x-test-user-id', 'user-1')
      .expect(400);

    await request(app.getHttpServer()).get('/api/notifications').expect(403);
  });
});
