import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { ArchivesController } from '../src/modules/archives/archives.controller';
import { ArchivesService } from '../src/modules/archives/archives.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => structuredClone(value);

const now = new Date('2026-04-20T12:00:00.000Z');

const makeArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 'article-1',
  title: '归档文章一',
  slug: 'archive-article-1',
  excerpt: '第一篇归档文章',
  content: '# archive',
  contentHtml: '<h1>archive</h1>',
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
  userId: 'user-1',
  author: null as unknown as Article['author'],
  scheduledAt: null,
  createdAt: now,
  updatedAt: now,
  publishedAt: new Date('2026-04-18T10:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

class ArticleQueryBuilderMock {
  private readonly source: Article[];
  private startDate?: Date;
  private endDate?: Date;
  private skipCount = 0;
  private takeCount?: number;
  private orderDirection: 'ASC' | 'DESC' = 'DESC';

  constructor(items: Article[]) {
    this.source = items.map(item => cloneValue(item));
  }

  select(): this {
    return this;
  }

  addSelect(): this {
    return this;
  }

  where(_query: string, params?: Record<string, unknown>): this {
    if (params?.startDate instanceof Date) {
      this.startDate = params.startDate;
    }
    if (params?.endDate instanceof Date) {
      this.endDate = params.endDate;
    }
    return this;
  }

  andWhere(_query: string, params?: Record<string, unknown>): this {
    if (params?.startDate instanceof Date) {
      this.startDate = params.startDate;
    }
    if (params?.endDate instanceof Date) {
      this.endDate = params.endDate;
    }
    return this;
  }

  groupBy(): this {
    return this;
  }

  addGroupBy(): this {
    return this;
  }

  orderBy(_field: string, direction: 'ASC' | 'DESC'): this {
    this.orderDirection = direction;
    return this;
  }

  addOrderBy(): this {
    return this;
  }

  skip(value: number): this {
    this.skipCount = value;
    return this;
  }

  take(value: number): this {
    this.takeCount = value;
    return this;
  }

  async getRawMany(): Promise<Array<{ year: string; month: string; count: string }>> {
    const groups = new Map<string, { year: number; month: number; count: number }>();

    this.source
      .filter(item => item.status === 'published' && item.deletedAt === null && item.publishedAt)
      .forEach(item => {
        const year = item.publishedAt!.getFullYear();
        const month = item.publishedAt!.getMonth() + 1;
        const key = `${year}-${month}`;
        const current = groups.get(key) ?? { year, month, count: 0 };
        current.count += 1;
        groups.set(key, current);
      });

    return [...groups.values()]
      .sort((left, right) => {
        if (left.year !== right.year) {
          return right.year - left.year;
        }
        return right.month - left.month;
      })
      .map(group => ({
        year: String(group.year),
        month: String(group.month),
        count: String(group.count),
      }));
  }

  private getFilteredArticles(): Article[] {
    const filtered = this.source.filter(item => {
      if (item.status !== 'published' || item.deletedAt !== null || !item.publishedAt) {
        return false;
      }

      if (this.startDate && item.publishedAt < this.startDate) {
        return false;
      }

      if (this.endDate && item.publishedAt >= this.endDate) {
        return false;
      }

      return true;
    });

    return filtered.sort((left, right) => {
      const leftTime = left.publishedAt?.getTime() ?? 0;
      const rightTime = right.publishedAt?.getTime() ?? 0;
      return this.orderDirection === 'DESC' ? rightTime - leftTime : leftTime - rightTime;
    });
  }

  async getCount(): Promise<number> {
    return this.getFilteredArticles().length;
  }

  async getMany(): Promise<Article[]> {
    const filtered = this.getFilteredArticles();
    const end = this.takeCount === undefined ? filtered.length : this.skipCount + this.takeCount;
    return filtered.slice(this.skipCount, end);
  }
}

const createRepositoryMock = <T extends ObjectLiteral>(seed: T[] = []): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    createQueryBuilder: jest.fn().mockImplementation(() => {
      return new ArticleQueryBuilderMock(items as unknown as Article[]);
    }),
  };
};

describe('Archives integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const articleRepository = createRepositoryMock<Article>([
      makeArticle({
        id: 'article-1',
        title: '四月文章 A',
        slug: 'april-a',
        publishedAt: new Date('2026-04-18T10:00:00.000Z'),
      }),
      makeArticle({
        id: 'article-2',
        title: '四月文章 B',
        slug: 'april-b',
        publishedAt: new Date('2026-04-05T09:00:00.000Z'),
      }),
      makeArticle({
        id: 'article-3',
        title: '三月文章',
        slug: 'march-a',
        publishedAt: new Date('2026-03-15T08:00:00.000Z'),
      }),
      makeArticle({
        id: 'article-4',
        title: '去年文章',
        slug: 'last-year',
        publishedAt: new Date('2025-12-20T08:00:00.000Z'),
      }),
      makeArticle({
        id: 'article-5',
        title: '草稿文章',
        slug: 'draft-article',
        status: 'draft',
        publishedAt: new Date('2026-04-01T08:00:00.000Z'),
      }),
      makeArticle({
        id: 'article-6',
        title: '已删除文章',
        slug: 'deleted-article',
        deletedAt: new Date('2026-04-10T08:00:00.000Z'),
        publishedAt: new Date('2026-04-09T08:00:00.000Z'),
      }),
    ]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ArchivesController],
      providers: [
        ArchivesService,
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
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

  it('应返回按年月倒序排列的归档摘要，且忽略草稿与已删除文章', async () => {
    const response = await request(app.getHttpServer()).get('/api/archives').expect(200);

    expect(response.body.data).toEqual([
      { year: 2026, month: 4, count: 2 },
      { year: 2026, month: 3, count: 1 },
      { year: 2025, month: 12, count: 1 },
    ]);
  });

  it('应返回指定月份的归档文章分页结果，并按发布时间倒序', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/archives/articles?year=2026&month=4&page=1&pageSize=1')
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        year: 2026,
        month: 4,
        total: 2,
        page: 1,
        pageSize: 1,
        totalPages: 2,
      }),
    );
    expect(response.body.data.articles).toHaveLength(1);
    expect(response.body.data.articles[0]).toEqual(
      expect.objectContaining({
        id: 'article-1',
        title: '四月文章 A',
        slug: 'april-a',
      }),
    );
  });

  it('应对空月份返回空结果，并在缺失参数时返回校验错误', async () => {
    const emptyResponse = await request(app.getHttpServer())
      .get('/api/archives/articles?year=2024&month=1&page=1&pageSize=10')
      .expect(200);

    expect(emptyResponse.body.data).toEqual({
      year: 2024,
      month: 1,
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      articles: [],
    });

    await request(app.getHttpServer())
      .get('/api/archives/articles?month=4')
      .expect(400);
  });
});
