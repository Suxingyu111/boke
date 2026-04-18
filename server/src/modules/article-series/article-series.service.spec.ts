import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, ArticleSeries, ArticleSeriesItem, User } from '@database/entities';
import { ArticleSeriesService } from './article-series.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const matchWhere = <T extends Record<string, unknown>>(
  item: T,
  where?: Partial<T> | Array<Partial<T>>,
): boolean => {
  if (!where) {
    return true;
  }

  const conditions = Array.isArray(where) ? where : [where];
  return conditions.some(condition =>
    Object.entries(condition).every(([key, value]) => item[key] === value),
  );
};

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? `series-${items.length + 1}`,
    })),
    find: jest.fn().mockImplementation(async (options?: { where?: Partial<T> | Array<Partial<T>> }) => {
      return items.filter(item => matchWhere(item as Record<string, unknown>, options?.where));
    }),
    findAndCount: jest.fn().mockResolvedValue([items, items.length]),
    findOne: jest.fn().mockImplementation(async (options: { where: Partial<T> | Array<Partial<T>> }) => {
      return items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null;
    }),
    save: jest.fn().mockImplementation(async (entity: T | T[]) => {
      if (Array.isArray(entity)) {
        const result = [] as T[];
        for (const item of entity) {
          result.push((await (createRepositoryMock<T>(items).save as Repository<T>['save'])(item)) as T);
        }
        return result;
      }

      const index = entity.id ? items.findIndex(item => item.id === entity.id) : -1;
      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const saved = cloneValue({
        ...entity,
        id: entity.id ?? `series-${items.length + 1}`,
      });
      items.push(saved);
      return saved;
    }),
    delete: jest.fn().mockImplementation(async (criteria: Partial<T> | string) => {
      const normalizedCriteria =
        typeof criteria === 'string' ? ({ id: criteria } as unknown as Partial<T>) : criteria;
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

describe('ArticleSeriesService', () => {
  let service: ArticleSeriesService;
  let articleRepository: RepositoryMock<Article>;
  let seriesRepository: RepositoryMock<ArticleSeries>;
  let seriesItemRepository: RepositoryMock<ArticleSeriesItem>;

  beforeEach(async () => {
    articleRepository = createRepositoryMock<Article>([
      {
        id: '42000000-0000-4000-8000-000000000001',
        title: '作者自己的文章',
        slug: 'own-article',
        excerpt: null,
        content: '# own',
        contentHtml: null,
        coverImage: null,
        categoryId: 'category-1',
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
        scheduledAt: null,
        createdAt: new Date('2026-04-18T00:00:00.000Z'),
        updatedAt: new Date('2026-04-18T00:00:00.000Z'),
        publishedAt: new Date('2026-04-18T00:00:00.000Z'),
        deletedAt: null,
      } as Article,
      {
        id: '42000000-0000-4000-8000-000000000002',
        title: '别人的文章',
        slug: 'other-article',
        excerpt: null,
        content: '# other',
        contentHtml: null,
        coverImage: null,
        categoryId: 'category-1',
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
        userId: 'author-2',
        scheduledAt: null,
        createdAt: new Date('2026-04-18T00:00:00.000Z'),
        updatedAt: new Date('2026-04-18T00:00:00.000Z'),
        publishedAt: new Date('2026-04-18T00:00:00.000Z'),
        deletedAt: null,
      } as Article,
    ]);
    seriesRepository = createRepositoryMock<ArticleSeries>([]);
    seriesItemRepository = createRepositoryMock<ArticleSeriesItem>([]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleSeriesService,
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
    }).compile();

    service = moduleRef.get(ArticleSeriesService);
  });

  it('作者不应将他人的文章加入自己的系列', async () => {
    await expect(
      service.create(
        {
          name: '非法系列',
          slug: 'forbidden-series',
          status: 'draft',
          items: [
            { articleId: '42000000-0000-4000-8000-000000000001', sortOrder: 1 },
            { articleId: '42000000-0000-4000-8000-000000000002', sortOrder: 2 },
          ],
        },
        {
          id: 'author-1',
          role: 'author',
        } as User,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('公开详情只应返回已发布文章并按排序输出', async () => {
    seriesRepository.items.push(
      {
        id: 'series-1',
        name: 'NestJS 系列',
        slug: 'nestjs-series',
        description: 'desc',
        coverImageUrl: null,
        status: 'published',
        createdBy: 'author-1',
        createdAt: new Date('2026-04-18T00:00:00.000Z'),
        updatedAt: new Date('2026-04-18T00:00:00.000Z'),
      } as ArticleSeries,
    );
    seriesItemRepository.items.push(
      {
        seriesId: 'series-1',
        articleId: '42000000-0000-4000-8000-000000000002',
        sortOrder: 1,
        createdAt: new Date('2026-04-18T00:00:00.000Z'),
      } as ArticleSeriesItem,
      {
        seriesId: 'series-1',
        articleId: '42000000-0000-4000-8000-000000000001',
        sortOrder: 2,
        createdAt: new Date('2026-04-18T00:00:00.000Z'),
      } as ArticleSeriesItem,
    );
    articleRepository.items[1] = {
      ...articleRepository.items[1],
      status: 'draft',
    };

    const result = await service.findPublicDetail('nestjs-series');

    expect(result.items.map(item => item.slug)).toEqual(['own-article']);
  });
});