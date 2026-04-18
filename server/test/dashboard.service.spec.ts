import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, Category, Tag, Page, FriendLink } from '@database/entities';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';

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
    Object.entries(condition).every(([key, value]) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        '_type' in value &&
        (value as { _type?: string })._type === 'isNull'
      ) {
        return item[key] === null || item[key] === undefined;
      }

      return item[key] === value;
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

/** Maps raw SQL column names used in createQueryBuilder to entity field names */
const columnFieldMap: Record<string, string> = {
  'a.view_count': 'viewCount',
  'a.comment_count': 'commentCount',
};

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  const createQueryBuilderMock = () => {
    let selectedColumn = '';

    const builder = {
      select: jest.fn().mockImplementation((expr: string) => {
        const match = expr.match(/SUM\(([^)]+)\)/);
        if (match) {
          selectedColumn = match[1];
        }

        return builder;
      }),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockImplementation(async () => {
        const field = columnFieldMap[selectedColumn];

        if (!field) {
          return { total: '0' };
        }

        const total = items
          .filter(item => {
            const deletedAt = (item as Record<string, unknown>)['deletedAt'];

            return deletedAt === null || deletedAt === undefined;
          })
          .reduce(
            (sum, item) => sum + (Number((item as Record<string, unknown>)[field]) || 0),
            0,
          );

        return { total: String(total) };
      }),
    };

    return builder;
  };

  return {
    items,
    find: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
        take?: number;
        select?: (keyof T)[];
      }) => {
        let matched = items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        );

        matched = applyOrder(matched, options?.order as Partial<Record<string, 'ASC' | 'DESC'>>);

        if (options?.take) {
          matched = matched.slice(0, options.take);
        }

        return matched;
      },
    ),
    count: jest.fn().mockImplementation(
      async (options?: { where?: Partial<T> | Array<Partial<T>> }) => {
        return items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        ).length;
      },
    ),
    createQueryBuilder: jest.fn().mockImplementation(() => createQueryBuilderMock()),
  };
};

const makeArticle = (overrides: Partial<Article>): Article =>
  ({
    id: 'a-1',
    title: '默认文章',
    slug: 'default',
    excerpt: null,
    content: '# content',
    contentHtml: null,
    coverImage: null,
    categoryId: 'cat-1',
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
    createdAt: new Date('2026-04-10T00:00:00.000Z'),
    updatedAt: new Date('2026-04-10T00:00:00.000Z'),
    publishedAt: new Date('2026-04-10T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }) as Article;

describe('DashboardService', () => {
  let service: DashboardService;
  let articleRepository: RepositoryMock<Article>;
  let categoryRepository: RepositoryMock<Category>;
  let tagRepository: RepositoryMock<Tag>;
  let pageRepository: RepositoryMock<Page>;
  let friendLinkRepository: RepositoryMock<FriendLink>;

  beforeEach(async () => {
    articleRepository = createRepositoryMock<Article>([
      makeArticle({
        id: 'a-1',
        title: '第一篇文章',
        slug: 'first-post',
        status: 'published',
        viewCount: 100,
        commentCount: 5,
        createdAt: new Date('2026-04-10T00:00:00.000Z'),
      }),
      makeArticle({
        id: 'a-2',
        title: '第二篇文章',
        slug: 'second-post',
        status: 'published',
        viewCount: 200,
        commentCount: 10,
        createdAt: new Date('2026-04-12T00:00:00.000Z'),
      }),
      makeArticle({
        id: 'a-3',
        title: '草稿文章',
        slug: 'draft-post',
        status: 'draft',
        viewCount: 50,
        commentCount: 0,
        publishedAt: null,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
      }),
      makeArticle({
        id: 'a-deleted',
        title: '已删除文章',
        slug: 'deleted-post',
        status: 'published',
        viewCount: 999,
        commentCount: 999,
        deletedAt: new Date('2026-04-15T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
    ]);

    categoryRepository = createRepositoryMock<Category>([
      {
        id: 'cat-1',
        name: '技术',
        slug: 'tech',
        description: null,
        sortOrder: 0,
        articleCount: 2,
        isVisible: true,
        color: '#000000',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Category,
      {
        id: 'cat-2',
        name: '生活',
        slug: 'life',
        description: null,
        sortOrder: 1,
        articleCount: 1,
        isVisible: true,
        color: '#333333',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Category,
    ]);

    tagRepository = createRepositoryMock<Tag>([
      { id: 'tag-1', name: 'TypeScript', slug: 'ts', articleCount: 1, createdAt: new Date(), updatedAt: new Date() } as Tag,
      { id: 'tag-2', name: 'NestJS', slug: 'nest', articleCount: 1, createdAt: new Date(), updatedAt: new Date() } as Tag,
      { id: 'tag-3', name: 'React', slug: 'react', articleCount: 0, createdAt: new Date(), updatedAt: new Date() } as Tag,
    ]);

    pageRepository = createRepositoryMock<Page>([
      { id: 'page-1', title: '关于', slug: 'about', pageType: 'about', content: '', contentHtml: null, summary: null, isHomeVisible: true, status: 'published', seoTitle: null, seoDescription: null, publishedAt: new Date(), createdBy: 'user-1', updatedBy: null, createdAt: new Date(), updatedAt: new Date() } as Page,
    ]);

    friendLinkRepository = createRepositoryMock<FriendLink>([
      { id: 'fl-1', siteName: '友站A', siteUrl: 'https://a.com', logoUrl: null, description: null, contactEmail: null, applicantName: null, sortOrder: 0, status: 'approved', approvedAt: new Date(), createdAt: new Date(), updatedAt: new Date() } as FriendLink,
      { id: 'fl-2', siteName: '友站B', siteUrl: 'https://b.com', logoUrl: null, description: null, contactEmail: null, applicantName: null, sortOrder: 1, status: 'approved', approvedAt: new Date(), createdAt: new Date(), updatedAt: new Date() } as FriendLink,
    ]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
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
          provide: getRepositoryToken(Page),
          useValue: pageRepository,
        },
        {
          provide: getRepositoryToken(FriendLink),
          useValue: friendLinkRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('应返回正确的仪表盘统计数据（排除已删除文章）', async () => {
      const stats = await service.getStats();

      expect(stats).toEqual({
        articleCount: 3,
        totalViewCount: 350,
        totalCommentCount: 15,
        categoryCount: 2,
        tagCount: 3,
        draftCount: 1,
        publishedCount: 2,
        pageCount: 1,
        friendLinkCount: 2,
      });
    });
  });

  describe('getRecentArticles', () => {
    it('应按 createdAt 降序返回最近文章', async () => {
      const articles = await service.getRecentArticles();

      expect(articles.length).toBe(3);
      expect(articles[0].id).toBe('a-3');
      expect(articles[1].id).toBe('a-2');
      expect(articles[2].id).toBe('a-1');
    });

    it('应根据 limit 参数限制返回数量', async () => {
      const articles = await service.getRecentArticles(2);

      expect(articles.length).toBe(2);
      expect(articles[0].id).toBe('a-3');
      expect(articles[1].id).toBe('a-2');
    });
  });
});
