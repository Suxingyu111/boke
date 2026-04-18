import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, CommentEntity, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { UserNotificationsService } from '../src/modules/user-notifications/user-notifications.service';
import { PublicCommentsController } from '../src/modules/comments/public-comments.controller';
import { AdminCommentsController } from '../src/modules/comments/admin-comments.controller';
import { CommentsService } from '../src/modules/comments/comments.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../src/modules/auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createMockUuid = (index: number): string =>
  `20000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;

const matchWhere = <T extends Record<string, unknown>>(
  item: T,
  where?: Partial<T> | Array<Partial<T>>,
): boolean => {
  if (!where) {
    return true;
  }

  const conditions = Array.isArray(where) ? where : [where];

  return conditions.some(condition =>
    Object.entries(condition).every(([key, expectedValue]) => {
      if (
        typeof expectedValue === 'object' &&
        expectedValue !== null &&
        '_type' in expectedValue &&
        (expectedValue as { _type?: string })._type === 'isNull'
      ) {
        return item[key] === null || item[key] === undefined;
      }

      return item[key] === expectedValue;
    }),
  );
};

const applyOrder = <T extends Record<string, unknown>>(
  items: T[],
  order?: Partial<Record<string, 'ASC' | 'DESC'>>,
): T[] => {
  if (!order) {
    return items;
  }

  const [orderField, orderDirection] = Object.entries(order)[0] as [string, 'ASC' | 'DESC'];

  return [...items].sort((left, right) => {
    const leftValue = left[orderField] as string | number | Date | null;
    const rightValue = right[orderField] as string | number | Date | null;

    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue === null || leftValue === undefined) {
      return 1;
    }

    if (rightValue === null || rightValue === undefined) {
      return -1;
    }

    const leftComparable = leftValue instanceof Date ? leftValue.getTime() : leftValue;
    const rightComparable = rightValue instanceof Date ? rightValue.getTime() : rightValue;

    if (leftComparable < rightComparable) {
      return orderDirection === 'ASC' ? -1 : 1;
    }

    return orderDirection === 'ASC' ? 1 : -1;
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
    find: jest
      .fn()
      .mockImplementation(
        async (options?: {
          where?: Partial<T> | Array<Partial<T>>;
          order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
        }) => {
          const matched = items.filter(item =>
            matchWhere(item as Record<string, unknown>, options?.where),
          );

          return applyOrder(matched, options?.order as Partial<Record<string, 'ASC' | 'DESC'>>);
        },
      ),
    findAndCount: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
        skip?: number;
        take?: number;
      }) => {
        const matched = applyOrder(
          items.filter(item => matchWhere(item as Record<string, unknown>, options?.where)),
          options?.order as Partial<Record<string, 'ASC' | 'DESC'>>,
        );
        const skip = options?.skip ?? 0;
        const take = options?.take ?? matched.length;

        return [matched.slice(skip, skip + take), matched.length];
      },
    ),
    findOne: jest
      .fn()
      .mockImplementation(async (options: { where: Partial<T> | Array<Partial<T>> }) => {
        return (
          items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null
        );
      }),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const entityWithId = entity as { id?: string };
      const index =
        entityWithId.id !== undefined && entityWithId.id !== null
          ? items.findIndex(item => (item as { id?: string }).id === entityWithId.id)
          : -1;

      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const savedEntity = cloneValue({
        ...entity,
        id: entityWithId.id ?? createMockUuid(items.length + 1),
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

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: User | null;
    }>();

    const role = request.headers['x-test-role'];
    if (!role) {
      request.user = null;
      return true;
    }

    request.user = {
      id: request.headers['x-test-user-id'] ?? 'user-1',
      username: request.headers['x-test-username'] ?? 'member',
      email: request.headers['x-test-email'] ?? 'member@example.com',
      password: '',
      nickname: request.headers['x-test-nickname'] ?? '普通用户',
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      lastLoginAt: null,
      createdAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedAt: new Date('2026-04-17T00:00:00.000Z'),
    };

    return true;
  }
}

describe('Comments integration', () => {
  let app: INestApplication;
  let articleRepository: RepositoryMock<Article>;
  let commentRepository: RepositoryMock<CommentEntity>;
  let userRepository: RepositoryMock<User>;

  const notificationsService = {
    sendCommentNotification: jest.fn(),
  };

  const userNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeAll(async () => {
    articleRepository = createRepositoryMock<Article>([
      {
        id: 'article-1',
        title: 'NestJS 评论设计',
        slug: 'nestjs-comments-design',
        excerpt: '评论模块设计',
        content: '# 评论模块',
        contentHtml: '<h1>评论模块</h1>',
        coverImage: null,
        categoryId: 'category-1',
        category: null as unknown as Article['category'],
        status: 'published',
        visibility: 'public',
        allowComment: true,
        isTop: false,
        sortOrder: 0,
        viewCount: 0,
        likes: 0,
        commentCount: 0,
        seoTitle: null,
        seoDescription: null,
        seoKeywords: null,
        userId: 'author-1',
        author: null as unknown as Article['author'],
        scheduledAt: null,
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
        updatedAt: new Date('2026-04-17T00:00:00.000Z'),
        publishedAt: new Date('2026-04-17T00:00:00.000Z'),
        deletedAt: null,
      },
    ]);
    commentRepository = createRepositoryMock<CommentEntity>();
    userRepository = createRepositoryMock<User>([
      {
        id: 'author-1',
        username: 'author',
        email: 'author@example.com',
        password: '',
        nickname: '博主',
        avatar: null,
        bio: null,
        isActive: true,
        role: 'author',
        lastLoginAt: null,
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
        updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      },
    ]);

    const moduleBuilder = Test.createTestingModule({
      controllers: [PublicCommentsController, AdminCommentsController],
      providers: [
        CommentsService,
        RolesGuard,
        {
          provide: getRepositoryToken(CommentEntity),
          useValue: commentRepository,
        },
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: UserNotificationsService,
          useValue: userNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new MockAuthGuard())
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(new MockAuthGuard());

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

  it('应支持访客评论提交、后台审核和前台公开展示', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/articles/article-1/comments')
      .send({
        authorName: '访客甲',
        authorEmail: 'guest-a@example.com',
        content: '这篇文章很实用。',
      })
      .expect(201);

    expect(createResponse.body.data).toEqual(
      expect.objectContaining({
        message: '评论提交成功，等待审核',
      }),
    );
    expect(articleRepository.items[0].commentCount).toBe(0);

    const pendingPublicResponse = await request(app.getHttpServer())
      .get('/api/articles/article-1/comments')
      .expect(200);

    expect(pendingPublicResponse.body.data.items).toHaveLength(0);

    const commentId = commentRepository.items[0].id;

    await request(app.getHttpServer())
      .put(`/api/admin/comments/${commentId}/status`)
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-1')
      .send({ status: 'approved' })
      .expect(200);

    expect(articleRepository.items[0].commentCount).toBe(1);

    const publicResponse = await request(app.getHttpServer())
      .get('/api/articles/article-1/comments')
      .expect(200);

    expect(publicResponse.body.data.items).toHaveLength(1);
    expect(publicResponse.body.data.items[0]).toEqual(
      expect.objectContaining({
        authorName: '访客甲',
        content: '这篇文章很实用。',
      }),
    );
    expect(publicResponse.body.data.items[0]).not.toHaveProperty('authorEmail');
    expect(publicResponse.body.data.items[0]).not.toHaveProperty('ipAddress');
    expect(notificationsService.sendCommentNotification).toHaveBeenCalledWith(
      'author@example.com',
      'NestJS 评论设计',
      '访客甲',
    );
  });

  it('应支持管理员回复评论并在删除评论树时回收文章评论数', async () => {
    const rootCommentId = commentRepository.items[0].id;

    const replyResponse = await request(app.getHttpServer())
      .post(`/api/admin/comments/${rootCommentId}/reply`)
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-2')
      .set('x-test-username', 'site-admin')
      .set('x-test-email', 'admin@example.com')
      .set('x-test-nickname', 'site-admin')
      .send({ content: '感谢反馈，我们会继续完善。' })
      .expect(201);

    expect(replyResponse.body.data).toEqual(
      expect.objectContaining({
        parentId: rootCommentId,
        content: '感谢反馈，我们会继续完善。',
        status: 'approved',
      }),
    );
    expect(articleRepository.items[0].commentCount).toBe(2);

    await request(app.getHttpServer())
      .delete(`/api/admin/comments/${rootCommentId}`)
      .set('x-test-role', 'admin')
      .expect(200);

    expect(articleRepository.items[0].commentCount).toBe(0);
    expect(commentRepository.items).toHaveLength(0);

    const publicResponse = await request(app.getHttpServer())
      .get('/api/articles/article-1/comments')
      .expect(200);

    expect(publicResponse.body.data.items).toHaveLength(0);
  });
});