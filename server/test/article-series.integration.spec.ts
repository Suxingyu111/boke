import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, ArticleSeries, ArticleSeriesItem, Category, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AdminArticleSeriesController } from '../src/modules/article-series/admin-article-series.controller';
import { PublicArticleSeriesController } from '../src/modules/article-series/public-article-series.controller';
import { ArticleSeriesService } from '../src/modules/article-series/article-series.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

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
    find: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<string, 'ASC' | 'DESC'>>;
      }) => {
        const matched = items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        );

        return applyOrder(matched, options?.order);
      },
    ),
    findAndCount: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<string, 'ASC' | 'DESC'>>;
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
    findOne: jest.fn().mockImplementation(async (options: { where: Partial<T> | Array<Partial<T>> }) => {
      return items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null;
    }),
    save: jest.fn().mockImplementation(async (entity: T | T[]) => {
      if (Array.isArray(entity)) {
        const saved = [] as T[];
        for (const item of entity) {
          saved.push((await (createRepositoryMock<T>(items).save as Repository<T>['save'])(item)) as T);
        }
        return saved;
      }

      const entityWithId = entity as { id?: string };
      const index = entityWithId.id
        ? items.findIndex(item => (item as { id?: string }).id === entityWithId.id)
        : items.findIndex(item => JSON.stringify(item) === JSON.stringify(entity));

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
      id: request.headers['x-test-user-id'] ?? 'author-1',
      username: request.headers['x-test-username'] ?? 'author',
      email: request.headers['x-test-email'] ?? 'author@example.com',
      phone: null,
      password: '',
      nickname: '作者',
      registrationType: 'email',
      emailVerifiedAt: new Date('2026-04-18T00:00:00.000Z'),
      phoneVerifiedAt: null,
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      lastLoginAt: null,
      passwordChangedAt: new Date('2026-04-18T00:00:00.000Z'),
      createdAt: new Date('2026-04-18T00:00:00.000Z'),
      updatedAt: new Date('2026-04-18T00:00:00.000Z'),
    };

    return true;
  }
}

describe('ArticleSeries integration', () => {
  let app: INestApplication;
  let articleRepository: RepositoryMock<Article>;
  let seriesRepository: RepositoryMock<ArticleSeries>;
  let seriesItemRepository: RepositoryMock<ArticleSeriesItem>;

  beforeAll(async () => {
    articleRepository = createRepositoryMock<Article>([
      {
        id: '41000000-0000-4000-8000-000000000001',
        title: 'NestJS 基础篇',
        slug: 'nestjs-basic',
        excerpt: '基础篇',
        content: '# 基础篇',
        contentHtml: '<h1>基础篇</h1>',
        coverImage: null,
        categoryId: 'category-1',
        category: null as unknown as Category,
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
        author: null as unknown as User,
        scheduledAt: null,
        createdAt: new Date('2026-04-18T00:00:00.000Z'),
        updatedAt: new Date('2026-04-18T00:00:00.000Z'),
        publishedAt: new Date('2026-04-18T00:00:00.000Z'),
        deletedAt: null,
      },
      {
        id: '41000000-0000-4000-8000-000000000002',
        title: 'NestJS 进阶篇',
        slug: 'nestjs-advanced',
        excerpt: '进阶篇',
        content: '# 进阶篇',
        contentHtml: '<h1>进阶篇</h1>',
        coverImage: null,
        categoryId: 'category-1',
        category: null as unknown as Category,
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
        author: null as unknown as User,
        scheduledAt: null,
        createdAt: new Date('2026-04-18T00:00:00.000Z'),
        updatedAt: new Date('2026-04-18T00:00:00.000Z'),
        publishedAt: new Date('2026-04-18T00:00:00.000Z'),
        deletedAt: null,
      },
    ]);
    seriesRepository = createRepositoryMock<ArticleSeries>([]);
    seriesItemRepository = createRepositoryMock<ArticleSeriesItem>([]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminArticleSeriesController, PublicArticleSeriesController],
      providers: [
        ArticleSeriesService,
        RolesGuard,
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
        {
          provide: getRepositoryToken(ArticleSeries),
          useValue: seriesRepository,
        },
        {
          provide: getRepositoryToken(ArticleSeriesItem),
          useValue: seriesItemRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new MockJwtAuthGuard())
      .compile();

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

  it('应支持系列文章创建、排序和公开目录展示', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/admin/series')
      .set('x-test-role', 'author')
      .set('x-test-user-id', 'author-1')
      .send({
        name: 'NestJS 入门系列',
        slug: 'nestjs-series',
        description: '从基础到进阶',
        status: 'published',
        items: [
          { articleId: '41000000-0000-4000-8000-000000000001', sortOrder: 1 },
          { articleId: '41000000-0000-4000-8000-000000000002', sortOrder: 2 },
        ],
      })
      .expect(201);

    expect(createResponse.body.data).toEqual(
      expect.objectContaining({
        name: 'NestJS 入门系列',
        slug: 'nestjs-series',
        status: 'published',
      }),
    );
    expect(createResponse.body.data.items).toHaveLength(2);

    const seriesId = createResponse.body.data.id as string;

    const adminListResponse = await request(app.getHttpServer())
      .get('/api/admin/series?page=1&pageSize=10')
      .set('x-test-role', 'author')
      .set('x-test-user-id', 'author-1')
      .expect(200);

    expect(adminListResponse.body.data.items).toHaveLength(1);
    expect(adminListResponse.body.data.meta.total).toBe(1);

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/admin/series/${seriesId}`)
      .set('x-test-role', 'author')
      .set('x-test-user-id', 'author-1')
      .expect(200);

    expect(detailResponse.body.data.items.map((item: { articleId: string }) => item.articleId)).toEqual([
      '41000000-0000-4000-8000-000000000001',
      '41000000-0000-4000-8000-000000000002',
    ]);

    await request(app.getHttpServer())
      .patch(`/api/admin/series/${seriesId}`)
      .set('x-test-role', 'author')
      .set('x-test-user-id', 'author-1')
      .send({
        name: 'NestJS 完整系列',
        items: [
          { articleId: '41000000-0000-4000-8000-000000000002', sortOrder: 1 },
          { articleId: '41000000-0000-4000-8000-000000000001', sortOrder: 2 },
        ],
      })
      .expect(200);

    const publicDetailResponse = await request(app.getHttpServer())
      .get('/api/series/nestjs-series')
      .expect(200);

    expect(publicDetailResponse.body.data).toEqual(
      expect.objectContaining({
        slug: 'nestjs-series',
        name: 'NestJS 完整系列',
      }),
    );
    expect(publicDetailResponse.body.data.items.map((item: { slug: string }) => item.slug)).toEqual([
      'nestjs-advanced',
      'nestjs-basic',
    ]);

    await request(app.getHttpServer())
      .delete(`/api/admin/series/${seriesId}`)
      .set('x-test-role', 'author')
      .set('x-test-user-id', 'author-1')
      .expect(200);

    expect(seriesRepository.items).toHaveLength(0);
  });
});