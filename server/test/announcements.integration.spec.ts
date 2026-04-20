import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { Announcement, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AdminAnnouncementsController } from '../src/modules/announcements/admin-announcements.controller';
import { PublicAnnouncementsController } from '../src/modules/announcements/public-announcements.controller';
import { AnnouncementsService } from '../src/modules/announcements/announcements.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createMockUuid = (index: number): string =>
  `30000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;

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
      async (options: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
      }) => {
        const matched = applyOrder(
          items.filter(item => matchWhere(item as Record<string, unknown>, options.where)),
          options.order,
        );

        return matched[0] ?? null;
      },
    ),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const incoming = entity as T & { id?: string; createdAt?: Date; updatedAt?: Date };
      const now = new Date('2026-04-20T12:00:00.000Z');
      const index =
        incoming.id !== undefined && incoming.id !== null
          ? items.findIndex(item => (item as { id?: string }).id === incoming.id)
          : -1;

      if (index >= 0) {
        const updatedEntity = cloneValue({
          ...items[index],
          ...incoming,
          updatedAt: incoming.updatedAt ?? now,
        });
        items[index] = updatedEntity;
        return updatedEntity;
      }

      const savedEntity = cloneValue({
        ...incoming,
        id: incoming.id ?? createMockUuid(items.length + 1),
        createdAt: incoming.createdAt ?? now,
        updatedAt: incoming.updatedAt ?? now,
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

const now = new Date('2026-04-20T09:00:00.000Z');

const makeAnnouncement = (overrides: Partial<Announcement> = {}): Announcement => ({
  id: 'announcement-1',
  title: '版本发布公告',
  content: '新版博客系统已经上线。',
  status: 'published',
  isPinned: false,
  publishedAt: new Date('2026-04-18T09:00:00.000Z'),
  createdBy: 'admin-1',
  createdAt: now,
  updatedAt: now,
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

describe('Announcements integration', () => {
  let app: INestApplication;
  let announcementRepository: RepositoryMock<Announcement>;

  beforeAll(async () => {
    announcementRepository = createRepositoryMock<Announcement>([
      makeAnnouncement({
        id: 'announcement-1',
        title: '常规公告',
        isPinned: false,
        publishedAt: new Date('2026-04-17T09:00:00.000Z'),
      }),
      makeAnnouncement({
        id: 'announcement-2',
        title: '置顶旧公告',
        isPinned: true,
        publishedAt: new Date('2026-04-18T08:00:00.000Z'),
      }),
      makeAnnouncement({
        id: 'announcement-3',
        title: '置顶新公告',
        isPinned: true,
        publishedAt: new Date('2026-04-19T08:00:00.000Z'),
      }),
      makeAnnouncement({
        id: 'announcement-4',
        title: '草稿公告',
        status: 'draft',
        isPinned: true,
        publishedAt: null,
      }),
    ]);

    const moduleBuilder = Test.createTestingModule({
      controllers: [PublicAnnouncementsController, AdminAnnouncementsController],
      providers: [
        AnnouncementsService,
        RolesGuard,
        {
          provide: getRepositoryToken(Announcement),
          useValue: announcementRepository,
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

  it('应返回已发布公告分页结果，并优先展示最新置顶公告', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/api/announcements?page=1&pageSize=2')
      .expect(200);

    expect(listResponse.body.data).toEqual(
      expect.objectContaining({
        total: 3,
        page: 1,
        pageSize: 2,
        totalPages: 2,
      }),
    );
    expect(listResponse.body.data.items).toHaveLength(2);
    expect(listResponse.body.data.items[0]).toEqual(
      expect.objectContaining({
        id: 'announcement-3',
        title: '置顶新公告',
        status: 'published',
        isPinned: true,
      }),
    );
    expect(listResponse.body.data.items[1]).toEqual(
      expect.objectContaining({
        id: 'announcement-2',
        title: '置顶旧公告',
      }),
    );

    const pinnedResponse = await request(app.getHttpServer())
      .get('/api/announcements/pinned')
      .expect(200);

    expect(pinnedResponse.body.data).toEqual(
      expect.objectContaining({
        id: 'announcement-3',
        title: '置顶新公告',
      }),
    );
  });

  it('应拒绝普通用户访问后台公告列表', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/announcements')
      .set('x-test-role', 'user')
      .expect(403);
  });

  it('应支持管理员创建、更新和删除公告', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/admin/announcements')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-9')
      .send({
        title: '  节日维护通知  ',
        content: '  系统将在凌晨进行短暂维护。  ',
        status: 'published',
        isPinned: true,
      })
      .expect(201);

    expect(createResponse.body.data).toEqual(
      expect.objectContaining({
        title: '节日维护通知',
        content: '系统将在凌晨进行短暂维护。',
        status: 'published',
        isPinned: true,
        createdBy: 'admin-9',
      }),
    );

    const createdId = createResponse.body.data.id as string;

    const adminListResponse = await request(app.getHttpServer())
      .get('/api/admin/announcements?page=1&pageSize=10')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(adminListResponse.body.data.total).toBe(5);
    expect(adminListResponse.body.data.items[0]).toEqual(
      expect.objectContaining({
        id: createdId,
        title: '节日维护通知',
      }),
    );

    const updateResponse = await request(app.getHttpServer())
      .put(`/api/admin/announcements/${createdId}`)
      .set('x-test-role', 'admin')
      .send({
        title: '维护完成通知',
        content: '维护已经完成，服务恢复正常。',
        status: 'archived',
        isPinned: false,
      })
      .expect(200);

    expect(updateResponse.body.data).toEqual(
      expect.objectContaining({
        id: createdId,
        title: '维护完成通知',
        status: 'archived',
        isPinned: false,
      }),
    );

    const publicListResponse = await request(app.getHttpServer())
      .get('/api/announcements')
      .expect(200);

    expect(
      publicListResponse.body.data.items.some(
        (item: { id: string }) => item.id === createdId,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .delete(`/api/admin/announcements/${createdId}`)
      .set('x-test-role', 'admin')
      .expect(200);

    expect(announcementRepository.items.some(item => item.id === createdId)).toBe(false);
  });
});
