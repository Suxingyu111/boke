import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, ArticleTag, Category, Tag, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { CategoriesController } from '../src/modules/categories/categories.controller';
import { CategoriesService } from '../src/modules/categories/categories.service';
import { TagsController } from '../src/modules/tags/tags.controller';
import { TagsService } from '../src/modules/tags/tags.service';
import { AdminArticlesController } from '../src/modules/articles/admin-articles.controller';
import { PublicArticlesController } from '../src/modules/articles/public-articles.controller';
import { ArticlesService } from '../src/modules/articles/articles.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createMockUuid = (index: number): string =>
  `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;

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
      if (expectedValue === null) {
        return item[key] === null;
      }

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
      .mockImplementation(async (options?: { where?: Partial<T> | Array<Partial<T>> }) => {
        return items.filter(item => matchWhere(item as Record<string, unknown>, options?.where));
      }),
    findOne: jest
      .fn()
      .mockImplementation(async (options: { where: Partial<T> | Array<Partial<T>> }) => {
        return (
          items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null
        );
      }),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const entityWithId = entity as { id?: string };
      const canUpdateById = entityWithId.id !== undefined && entityWithId.id !== null;
      const index = canUpdateById
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
    remove: jest.fn().mockImplementation(async (entity: T) => {
      const entityWithId = entity as { id?: string };
      const index =
        entityWithId.id !== undefined && entityWithId.id !== null
          ? items.findIndex(item => (item as { id?: string }).id === entityWithId.id)
          : items.findIndex(item => JSON.stringify(item) === JSON.stringify(entity));

      if (index >= 0) {
        items.splice(index, 1);
      }

      return entity;
    }),
    delete: jest.fn().mockImplementation(async (criteria: Partial<T>) => {
      const targets = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => matchWhere(item as Record<string, unknown>, criteria));

      targets
        .map(target => target.index)
        .sort((left, right) => right - left)
        .forEach(index => {
          if (index >= 0) {
            items.splice(index, 1);
          }
        });

      return { affected: targets.length, raw: {} };
    }),
    count: jest
      .fn()
      .mockImplementation(async (options?: { where?: Partial<T> | Array<Partial<T>> }) => {
        return items.filter(item => matchWhere(item as Record<string, unknown>, options?.where))
          .length;
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
      id: request.headers['x-test-user-id'] ?? 'admin-user-id',
      username: request.headers['x-test-username'] ?? 'admin',
      email: request.headers['x-test-email'] ?? 'admin@example.com',
      password: '',
      nickname: '管理员',
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      lastLoginAt: null,
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    };

    return true;
  }
}

describe('Articles integration', () => {
  let app: INestApplication;
  let articleRepository: RepositoryMock<Article>;
  let categoryRepository: RepositoryMock<Category>;
  let tagRepository: RepositoryMock<Tag>;
  let articleTagRepository: RepositoryMock<ArticleTag>;

  beforeAll(async () => {
    articleRepository = createRepositoryMock<Article>();
    categoryRepository = createRepositoryMock<Category>();
    tagRepository = createRepositoryMock<Tag>();
    articleTagRepository = createRepositoryMock<ArticleTag>();

    const moduleBuilder = Test.createTestingModule({
      controllers: [
        CategoriesController,
        TagsController,
        AdminArticlesController,
        PublicArticlesController,
      ],
      providers: [
        CategoriesService,
        TagsService,
        ArticlesService,
        RolesGuard,
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: tagRepository,
        },
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
        {
          provide: getRepositoryToken(ArticleTag),
          useValue: articleTagRepository,
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

  it('应支持分类、标签、草稿文章创建与管理端列表查询', async () => {
    const categoryResponse = await request(app.getHttpServer())
      .post('/api/admin/categories')
      .set('x-test-role', 'admin')
      .send({
        name: '后端开发',
        slug: 'backend-dev',
        description: '服务端文章',
        color: '#123456',
      })
      .expect(201);

    const firstTagResponse = await request(app.getHttpServer())
      .post('/api/admin/tags')
      .set('x-test-role', 'admin')
      .send({
        name: 'NestJS',
        slug: 'nestjs',
      })
      .expect(201);

    const secondTagResponse = await request(app.getHttpServer())
      .post('/api/admin/tags')
      .set('x-test-role', 'admin')
      .send({
        name: 'TypeORM',
        slug: 'typeorm',
      })
      .expect(201);

    const articleResponse = await request(app.getHttpServer())
      .post('/api/admin/articles')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'author-1')
      .send({
        title: '文章接口设计',
        slug: 'article-api-design',
        content: '# Markdown 内容',
        excerpt: '文章摘要',
        categoryId: categoryResponse.body.data.id,
        tagIds: [firstTagResponse.body.data.id, secondTagResponse.body.data.id],
        status: 'draft',
      })
      .expect(201);

    expect(articleResponse.body.data).toEqual(
      expect.objectContaining({
        title: '文章接口设计',
        status: 'draft',
      }),
    );
    expect(articleResponse.body.data.category).toEqual(
      expect.objectContaining({
        slug: 'backend-dev',
      }),
    );
    expect(articleResponse.body.data.tags).toHaveLength(2);

    const adminListResponse = await request(app.getHttpServer())
      .get('/api/admin/articles?page=1&pageSize=10')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(adminListResponse.body.data.items).toHaveLength(1);
    expect(adminListResponse.body.data.meta).toEqual(
      expect.objectContaining({
        total: 1,
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it('scheduledAt 已到期的文章应出现在公开列表，详情请求应累计阅读量', async () => {
    const categoryId = categoryRepository.items[0].id as string;
    const tagIds = tagRepository.items.map(item => item.id as string);

    await request(app.getHttpServer())
      .post('/api/admin/articles')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'author-2')
      .send({
        title: '定时发布文章',
        slug: 'scheduled-article',
        content: 'scheduled content',
        categoryId,
        tagIds,
        status: 'scheduled',
        scheduledAt: '2026-04-15T08:00:00.000Z',
      })
      .expect(201);

    const publicListResponse = await request(app.getHttpServer())
      .get('/api/articles?page=1&pageSize=10')
      .expect(200);

    expect(publicListResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'scheduled-article',
          status: 'published',
        }),
      ]),
    );

    const detailResponse = await request(app.getHttpServer())
      .get('/api/articles/scheduled-article')
      .expect(200);

    expect(detailResponse.body.data).toEqual(
      expect.objectContaining({
        slug: 'scheduled-article',
        viewCount: 1,
      }),
    );
    expect(detailResponse.body.data.tags).toHaveLength(2);
  });

  it('应校验定时发布参数，并支持文章更新与删除', async () => {
    const invalidResponse = await request(app.getHttpServer())
      .post('/api/admin/articles')
      .set('x-test-role', 'admin')
      .send({
        title: '非法定时文章',
        slug: 'invalid-scheduled-article',
        content: 'invalid',
        categoryId: categoryRepository.items[0].id,
        status: 'scheduled',
      })
      .expect(400);

    expect(invalidResponse.body.message).toContain('scheduledAt');

    const targetArticle = articleRepository.items.find(item => item.slug === 'article-api-design');
    expect(targetArticle).toBeDefined();

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/admin/articles/${targetArticle?.id}`)
      .set('x-test-role', 'admin')
      .send({
        title: '文章接口设计（已发布）',
        status: 'published',
      })
      .expect(200);

    expect(updateResponse.body.data).toEqual(
      expect.objectContaining({
        title: '文章接口设计（已发布）',
        status: 'published',
      }),
    );

    await request(app.getHttpServer())
      .delete(`/api/admin/articles/${targetArticle?.id}`)
      .set('x-test-role', 'admin')
      .expect(200);

    const publicListResponse = await request(app.getHttpServer())
      .get('/api/articles?page=1&pageSize=10')
      .expect(200);

    expect(
      publicListResponse.body.data.items.find(
        (item: { slug: string }) => item.slug === 'article-api-design',
      ),
    ).toBeUndefined();
  });

  it('分类和标签应支持更新、删除与引用校验', async () => {
    const category = categoryRepository.items[0];
    const tag = tagRepository.items[0];

    const removableTagResponse = await request(app.getHttpServer())
      .post('/api/admin/tags')
      .set('x-test-role', 'admin')
      .send({
        name: 'Removable',
        slug: 'removable',
      })
      .expect(201);

    const categoryUpdateResponse = await request(app.getHttpServer())
      .patch(`/api/admin/categories/${category.id}`)
      .set('x-test-role', 'admin')
      .send({
        name: '服务端开发',
      })
      .expect(200);

    expect(categoryUpdateResponse.body.data.name).toBe('服务端开发');

    const tagUpdateResponse = await request(app.getHttpServer())
      .patch(`/api/admin/tags/${tag.id}`)
      .set('x-test-role', 'admin')
      .send({
        name: 'NestJS Framework',
      })
      .expect(200);

    expect(tagUpdateResponse.body.data.name).toBe('NestJS Framework');

    const categoryDeleteResponse = await request(app.getHttpServer())
      .delete(`/api/admin/categories/${category.id}`)
      .set('x-test-role', 'admin')
      .expect(409);

    expect(categoryDeleteResponse.body.message).toContain('分类下仍有文章');

    await request(app.getHttpServer())
      .delete(`/api/admin/tags/${removableTagResponse.body.data.id}`)
      .set('x-test-role', 'admin')
      .expect(200);
  });
});
