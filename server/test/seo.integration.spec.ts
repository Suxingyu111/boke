import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, Page, SiteSetting } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { SeoController } from '../src/modules/seo/seo.controller';
import { SeoService } from '../src/modules/seo/seo.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => structuredClone(value);

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

  const [field, direction] = Object.entries(order)[0] as [keyof T, 'ASC' | 'DESC'];

  return [...items].sort((left, right) => {
    const leftValue = left[field] as string | number | Date | null;
    const rightValue = right[field] as string | number | Date | null;

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
      return direction === 'ASC' ? -1 : 1;
    }

    return direction === 'ASC' ? 1 : -1;
  });
};

const createRepositoryMock = <T extends ObjectLiteral>(seed: T[] = []): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
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
    find: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
      }) => {
        return applyOrder(
          items.filter(item => matchWhere(item as Record<string, unknown>, options?.where)),
          options?.order,
        );
      },
    ),
    createQueryBuilder: jest.fn().mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(items),
    })),
  };
};

const now = new Date('2026-04-20T10:30:00.000Z');

const makeArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 'article-1',
  title: 'NestJS SEO 设计',
  slug: 'nestjs-seo-design',
  excerpt: '介绍博客 SEO 设计细节',
  content: '# SEO',
  contentHtml: '<h1>SEO</h1>',
  coverImage: 'https://cdn.example.com/cover.png',
  categoryId: 'category-1',
  category: {
    id: 'category-1',
    name: '架构设计',
    slug: 'architecture',
    description: '架构设计',
    articleCount: 1,
    sortOrder: 0,
    isVisible: true,
    color: '#1f4d6d',
    createdAt: now,
    updatedAt: now,
  } as Article['category'],
  status: 'published',
  visibility: 'public',
  allowComment: true,
  isTop: false,
  sortOrder: 0,
  viewCount: 0,
  likes: 0,
  commentCount: 0,
  seoTitle: 'NestJS SEO 最佳实践',
  seoDescription: '覆盖文章页的 SEO 标题与描述',
  seoKeywords: 'nestjs,seo,blog',
  userId: 'user-1',
  author: {
    id: 'user-1',
    username: 'author',
    email: 'author@example.com',
    password: '',
    nickname: '山海',
    avatar: null,
    bio: null,
    isActive: true,
    role: 'admin',
    oauthProvider: null,
    oauthProviderId: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  } as Article['author'],
  scheduledAt: null,
  createdAt: now,
  updatedAt: new Date('2026-04-20T11:00:00.000Z'),
  publishedAt: new Date('2026-04-19T09:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

const makePage = (overrides: Partial<Page> = {}): Page => ({
  id: 'page-1',
  title: '关于我',
  slug: 'about',
  pageType: 'about',
  content: '# About',
  contentHtml: '<h1>About</h1>',
  summary: '介绍站点与作者',
  isHomeVisible: true,
  status: 'published',
  seoTitle: null,
  seoDescription: null,
  publishedAt: new Date('2026-04-18T08:00:00.000Z'),
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: now,
  updatedAt: new Date('2026-04-20T08:30:00.000Z'),
  ...overrides,
});

const makeSetting = (overrides: Partial<SiteSetting> = {}): SiteSetting => ({
  id: 1,
  settingKey: 'site_title',
  settingValue: '山海博客',
  valueType: 'string',
  groupName: 'general',
  description: '站点标题',
  isPublic: true,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('SEO integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const articleRepository = createRepositoryMock<Article>([
      makeArticle(),
      makeArticle({
        id: 'article-2',
        slug: 'draft-article',
        title: '草稿文章',
        status: 'draft',
        seoTitle: null,
        seoDescription: null,
        seoKeywords: null,
        publishedAt: null,
      }),
      makeArticle({
        id: 'article-3',
        slug: 'fallback-article',
        title: '默认 SEO 文章',
        excerpt: '回退到摘要',
        seoTitle: null,
        seoDescription: null,
        seoKeywords: null,
        coverImage: null,
      }),
    ]);

    const pageRepository = createRepositoryMock<Page>([
      makePage(),
      makePage({
        id: 'page-2',
        slug: 'project-showcase',
        title: '项目展示',
        pageType: 'portfolio',
        summary: '展示近期项目',
        seoTitle: '项目展示页',
        seoDescription: '项目展示 SEO 描述',
      }),
      makePage({
        id: 'page-3',
        slug: 'draft-page',
        title: '草稿页面',
        status: 'draft',
      }),
    ]);

    const settingRepository = createRepositoryMock<SiteSetting>([
      makeSetting(),
      makeSetting({
        id: 2,
        settingKey: 'site_description',
        settingValue: '记录工程、阅读与长期项目',
      }),
      makeSetting({
        id: 3,
        settingKey: 'site_keywords',
        settingValue: 'blog,nestjs,vue',
      }),
      makeSetting({
        id: 4,
        settingKey: 'og_image',
        settingValue: 'https://cdn.example.com/og.png',
      }),
    ]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SeoController],
      providers: [
        SeoService,
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
        {
          provide: getRepositoryToken(Page),
          useValue: pageRepository,
        },
        {
          provide: getRepositoryToken(SiteSetting),
          useValue: settingRepository,
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

  it('应返回站点级 SEO 设置与 sitemap 数据', async () => {
    const siteResponse = await request(app.getHttpServer()).get('/api/seo/site').expect(200);

    expect(siteResponse.body.data).toEqual(
      expect.objectContaining({
        site_title: '山海博客',
        site_description: '记录工程、阅读与长期项目',
        site_keywords: 'blog,nestjs,vue',
        og_image: 'https://cdn.example.com/og.png',
      }),
    );

    const sitemapResponse = await request(app.getHttpServer())
      .get('/api/seo/sitemap?baseUrl=https://blog.example.com')
      .expect(200);

    expect(sitemapResponse.body.data[0]).toEqual({
      loc: 'https://blog.example.com',
      changefreq: 'daily',
      priority: '1.0',
    });
    expect(sitemapResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          loc: 'https://blog.example.com/articles/nestjs-seo-design',
          changefreq: 'weekly',
          priority: '0.8',
        }),
        expect.objectContaining({
          loc: 'https://blog.example.com/pages/about',
          changefreq: 'monthly',
          priority: '0.6',
        }),
      ]),
    );
  });

  it('应返回文章和页面的 SEO 元数据，并处理字段回退', async () => {
    const articleResponse = await request(app.getHttpServer())
      .get('/api/seo/articles/nestjs-seo-design')
      .expect(200);

    expect(articleResponse.body.data).toEqual(
      expect.objectContaining({
        title: 'NestJS SEO 最佳实践',
        description: '覆盖文章页的 SEO 标题与描述',
        keywords: 'nestjs,seo,blog',
        ogType: 'article',
        ogImage: 'https://cdn.example.com/cover.png',
        author: '山海',
        category: '架构设计',
      }),
    );

    const fallbackArticleResponse = await request(app.getHttpServer())
      .get('/api/seo/articles/fallback-article')
      .expect(200);

    expect(fallbackArticleResponse.body.data).toEqual(
      expect.objectContaining({
        title: '默认 SEO 文章',
        description: '回退到摘要',
        keywords: '',
        ogImage: '',
      }),
    );

    const pageResponse = await request(app.getHttpServer())
      .get('/api/seo/pages/project-showcase')
      .expect(200);

    expect(pageResponse.body.data).toEqual(
      expect.objectContaining({
        title: '项目展示页',
        description: '项目展示 SEO 描述',
        ogType: 'website',
      }),
    );

    const fallbackPageResponse = await request(app.getHttpServer())
      .get('/api/seo/pages/about')
      .expect(200);

    expect(fallbackPageResponse.body.data).toEqual(
      expect.objectContaining({
        title: '关于我',
        description: '介绍站点与作者',
      }),
    );
  });

  it('应对未发布或不存在的文章页面返回 404', async () => {
    await request(app.getHttpServer()).get('/api/seo/articles/draft-article').expect(404);
    await request(app.getHttpServer()).get('/api/seo/pages/draft-page').expect(404);
    await request(app.getHttpServer()).get('/api/seo/pages/not-found-page').expect(404);
  });
});
