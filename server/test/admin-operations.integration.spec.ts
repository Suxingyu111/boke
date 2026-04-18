import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import {
  Article,
  ArticleTag,
  Category,
  OperationLog,
  Tag,
  User,
} from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AdminArticlesController } from '../src/modules/articles/admin-articles.controller';
import { ArticlesService } from '../src/modules/articles/articles.service';
import { AdminOperationLogsController } from '../src/modules/operation-logs/admin-operation-logs.controller';
import { OperationLogInterceptor } from '../src/modules/operation-logs/operation-log.interceptor';
import { OperationLogsService } from '../src/modules/operation-logs/operation-logs.service';
import { ArticleVersionsService } from '../src/modules/articles/article-versions.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createMockUuid = (index: number): string =>
  `50000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;

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
      id: (payload as { id?: string | number }).id ?? createMockUuid(items.length + 1),
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
    save: jest.fn().mockImplementation(async (entity: T) => {
      const entityWithId = entity as { id?: string | number };
      const index = entityWithId.id !== undefined
        ? items.findIndex(item => (item as { id?: string | number }).id === entityWithId.id)
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
    delete: jest.fn().mockImplementation(async (criteria: Partial<T> | string | number) => {
      const normalizedCriteria =
        typeof criteria === 'string' || typeof criteria === 'number'
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
    count: jest.fn().mockImplementation(async (options?: { where?: Partial<T> | Array<Partial<T>> }) => {
      return items.filter(item => matchWhere(item as Record<string, unknown>, options?.where)).length;
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
      createdAt: new Date('2026-04-18T00:00:00.000Z'),
      updatedAt: new Date('2026-04-18T00:00:00.000Z'),
    };

    return true;
  }
}

describe('Admin operations integration', () => {
  let app: INestApplication;
  let articleRepository: RepositoryMock<Article>;
  let categoryRepository: RepositoryMock<Category>;
  let tagRepository: RepositoryMock<Tag>;
  let articleTagRepository: RepositoryMock<ArticleTag>;
  let userRepository: RepositoryMock<User>;
  let operationLogRepository: RepositoryMock<OperationLog>;

  const articleVersionsService = {
    recordVersion: jest.fn(),
  };

  beforeAll(async () => {
    articleRepository = createRepositoryMock<Article>();
    categoryRepository = createRepositoryMock<Category>([
      {
        id: '51000000-0000-4000-8000-000000000001',
        name: '后端',
        slug: 'backend',
        description: null,
        color: '#000000',
        sortOrder: 0,
        articleCount: 0,
        isVisible: true,
        createdAt: new Date('2026-04-18T00:00:00.000Z'),
        updatedAt: new Date('2026-04-18T00:00:00.000Z'),
      } as Category,
    ]);
    tagRepository = createRepositoryMock<Tag>([]);
    articleTagRepository = createRepositoryMock<ArticleTag>([]);
    userRepository = createRepositoryMock<User>([]);
    operationLogRepository = createRepositoryMock<OperationLog>([]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminArticlesController, AdminOperationLogsController],
      providers: [
        ArticlesService,
        OperationLogsService,
        RolesGuard,
        {
          provide: APP_INTERCEPTOR,
          useClass: OperationLogInterceptor,
        },
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: tagRepository,
        },
        {
          provide: getRepositoryToken(ArticleTag),
          useValue: articleTagRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(OperationLog),
          useValue: operationLogRepository,
        },
        {
          provide: ArticleVersionsService,
          useValue: articleVersionsService,
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

  it('应支持导出文章为 Markdown，并记录后台关键操作日志', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/admin/articles')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-user-id')
      .send({
        title: '导出测试文章',
        slug: 'export-article-demo',
        content: '# Markdown 导出内容',
        excerpt: '用于导出测试',
        categoryId: '51000000-0000-4000-8000-000000000001',
        status: 'published',
      })
      .expect(201);

    const articleId = createResponse.body.data.id as string;

    const exportResponse = await request(app.getHttpServer())
      .get(`/api/admin/articles/${articleId}/export?format=markdown`)
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-user-id')
      .expect(200);

    expect(exportResponse.headers['content-type']).toContain('text/markdown');
    expect(exportResponse.text).toContain('# Markdown 导出内容');
    expect(exportResponse.text).toContain('title: 导出测试文章');

    const logsResponse = await request(app.getHttpServer())
      .get('/api/admin/operation-logs?page=1&pageSize=10&moduleName=articles')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-user-id')
      .expect(200);

    expect(logsResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleName: 'articles',
          actionName: 'create',
        }),
        expect.objectContaining({
          moduleName: 'articles',
          actionName: 'export',
        }),
      ]),
    );
  });
});