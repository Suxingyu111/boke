import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { EmailNotification, EmailSubscriber, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { AdminNotificationsController } from '../src/modules/notifications/admin-notifications.controller';
import { PublicSubscriptionController } from '../src/modules/notifications/public-subscription.controller';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { SubscriptionService } from '../src/modules/notifications/subscription.service';

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
      id: payload.id ?? `subscriber-${items.length + 1}`,
    })),
    findOne: jest.fn().mockImplementation(
      async (options: { where: Partial<T> | Array<Partial<T>> }) => {
        const conditions = Array.isArray(options.where) ? options.where : [options.where];
        return (
          items.find(item =>
            conditions.some(condition =>
              Object.entries(condition).every(
                ([key, value]) => item[key as keyof T] === value,
              ),
            ),
          ) ?? null
        );
      },
    ),
    findAndCount: jest.fn().mockImplementation(
      async (options?: {
        skip?: number;
        take?: number;
      }) => {
        const sorted = [...items].sort((left, right) => {
          const leftTime = (left as T & { subscribedAt?: Date }).subscribedAt?.getTime() ?? 0;
          const rightTime = (right as T & { subscribedAt?: Date }).subscribedAt?.getTime() ?? 0;
          return rightTime - leftTime;
        });
        const skip = options?.skip ?? 0;
        const take = options?.take ?? sorted.length;
        return [sorted.slice(skip, skip + take), sorted.length];
      },
    ),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const index = entity.id ? items.findIndex(item => item.id === entity.id) : -1;
      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const saved = cloneValue({
        ...entity,
        id: entity.id ?? `subscriber-${items.length + 1}`,
        subscribedAt:
          (entity as T & { subscribedAt?: Date }).subscribedAt ?? new Date('2026-04-20T13:00:00.000Z'),
      });
      items.push(saved);
      return saved;
    }),
    remove: jest.fn().mockImplementation(async (entity: T) => {
      const index = items.findIndex(item => item.id === entity.id);
      if (index >= 0) {
        items.splice(index, 1);
      }

      return entity;
    }),
  };
};

const now = new Date('2026-04-20T12:45:00.000Z');

const makeSubscriber = (overrides: Partial<EmailSubscriber> = {}): EmailSubscriber => ({
  id: 'subscriber-1',
  email: 'reader@example.com',
  name: '读者',
  isConfirmed: false,
  confirmToken: 'confirm-token-1',
  unsubscribeToken: 'unsubscribe-token-1',
  isActive: true,
  subscribedAt: now,
  confirmedAt: null,
  unsubscribedAt: null,
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
      password: '',
      nickname: '管理员',
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

describe('Subscriptions integration', () => {
  let app: INestApplication;
  let subscriberRepository: RepositoryMock<EmailSubscriber>;

  const notificationsService = {
    sendNotification: jest.fn(),
    notifySubscribersNewArticle: jest.fn(),
    retryFailed: jest.fn(),
    getNotifications: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
  };

  beforeAll(async () => {
    subscriberRepository = createRepositoryMock<EmailSubscriber>([
      makeSubscriber({
        id: 'subscriber-1',
        email: 'reader@example.com',
        name: '读者甲',
        isConfirmed: true,
        confirmToken: null,
        unsubscribeToken: 'unsubscribe-token-1',
        confirmedAt: new Date('2026-04-19T09:00:00.000Z'),
      }),
      makeSubscriber({
        id: 'subscriber-2',
        email: 'inactive@example.com',
        name: '休眠用户',
        isConfirmed: false,
        confirmToken: 'confirm-token-2',
        unsubscribeToken: 'unsubscribe-token-2',
        isActive: false,
        unsubscribedAt: new Date('2026-04-19T10:00:00.000Z'),
        subscribedAt: new Date('2026-04-19T08:00:00.000Z'),
      }),
    ]);

    const emailNotificationRepository = createRepositoryMock<EmailNotification>([]);

    const moduleBuilder = Test.createTestingModule({
      controllers: [PublicSubscriptionController, AdminNotificationsController],
      providers: [
        SubscriptionService,
        RolesGuard,
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: getRepositoryToken(EmailSubscriber),
          useValue: subscriberRepository,
        },
        {
          provide: getRepositoryToken(EmailNotification),
          useValue: emailNotificationRepository,
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

  it('应支持公开订阅、确认订阅与取消订阅', async () => {
    const subscribeResponse = await request(app.getHttpServer())
      .post('/api/subscriptions')
      .send({
        email: 'new-reader@example.com',
        name: '  新读者  ',
      })
      .expect(201);

    expect(subscribeResponse.body.data.message).toBe('订阅请求已提交，请查看邮箱确认');
    expect(typeof subscribeResponse.body.data.confirmToken).toBe('string');
    expect(subscribeResponse.body.data.confirmToken).toHaveLength(64);

    const created = subscriberRepository.items.find(item => item.email === 'new-reader@example.com');
    expect(created).toEqual(
      expect.objectContaining({
        email: 'new-reader@example.com',
        name: '  新读者  ',
        isConfirmed: false,
        isActive: true,
      }),
    );

    await request(app.getHttpServer())
      .get(`/api/subscriptions/confirm/${created?.confirmToken}`)
      .expect(200);

    expect(created?.isConfirmed).toBe(true);
    expect(created?.confirmToken).toBeNull();

    await request(app.getHttpServer())
      .get('/api/subscriptions/unsubscribe/unsubscribe-token-1')
      .expect(200);

    const unsubscribed = subscriberRepository.items.find(item => item.id === 'subscriber-1');
    expect(unsubscribed).toEqual(
      expect.objectContaining({
        isActive: false,
      }),
    );
    expect(unsubscribed?.unsubscribedAt).not.toBeNull();
  });

  it('应支持重新激活已停用订阅，并允许管理员分页查看和删除订阅者', async () => {
    const resubscribeResponse = await request(app.getHttpServer())
      .post('/api/subscriptions')
      .send({
        email: 'inactive@example.com',
        name: '重新激活',
      })
      .expect(201);

    expect(resubscribeResponse.body.data.message).toBe('订阅请求已提交，请查看邮箱确认');

    const reactivated = subscriberRepository.items.find(item => item.email === 'inactive@example.com');
    expect(reactivated).toEqual(
      expect.objectContaining({
        isActive: true,
        name: '重新激活',
        unsubscribedAt: null,
      }),
    );
    expect(typeof reactivated?.confirmToken).toBe('string');

    const listResponse = await request(app.getHttpServer())
      .get('/api/admin/notifications/subscribers?page=1&pageSize=1')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(listResponse.body.data).toEqual(
      expect.objectContaining({
        total: 3,
        page: 1,
        pageSize: 1,
        totalPages: 3,
      }),
    );
    expect(listResponse.body.data.items).toHaveLength(1);

    await request(app.getHttpServer())
      .delete('/api/admin/notifications/subscribers/subscriber-2')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(subscriberRepository.items.some(item => item.id === 'subscriber-2')).toBe(false);
  });

  it('应处理重复订阅、无效链接和后台越权或非法分页参数', async () => {
    await request(app.getHttpServer())
      .post('/api/subscriptions')
      .send({
        email: 'new-reader@example.com',
        name: '重复用户',
      })
      .expect(409);

    await request(app.getHttpServer())
      .get('/api/subscriptions/confirm/invalid-token')
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/subscriptions/unsubscribe/invalid-token')
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/admin/notifications/subscribers')
      .set('x-test-role', 'user')
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/admin/notifications/subscribers?page=abc&pageSize=1')
      .set('x-test-role', 'admin')
      .expect(400);
  });
});
