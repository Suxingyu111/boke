import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, ArticleTag, ArticleVersion, User } from '@database/entities';
import { ArticleVersionsService } from './article-versions.service';

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

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? `entity-${items.length + 1}`,
    })),
    find: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<string, 'ASC' | 'DESC'>>;
      }) => {
        return applyOrder(
          items.filter(item => matchWhere(item as Record<string, unknown>, options?.where)),
          options?.order,
        );
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
      const index = entity.id ? items.findIndex(item => item.id === entity.id) : -1;
      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const saved = cloneValue({
        ...entity,
        id: entity.id ?? `entity-${items.length + 1}`,
      });
      items.push(saved);
      return saved;
    }),
    delete: jest.fn().mockImplementation(async (criteria: Partial<T>) => {
      const targets = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => matchWhere(item as Record<string, unknown>, criteria));

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

describe('ArticleVersionsService', () => {
  let service: ArticleVersionsService;
  let articleRepository: RepositoryMock<Article>;
  let articleTagRepository: RepositoryMock<ArticleTag>;
  let articleVersionRepository: RepositoryMock<ArticleVersion>;

  beforeEach(async () => {
    articleRepository = createRepositoryMock<Article>([
      {
        id: 'article-1',
        title: '当前标题',
        slug: 'current-slug',
        excerpt: '当前摘要',
        content: '# 当前内容',
        contentHtml: '<h1>当前内容</h1>',
        coverImage: null,
        categoryId: 'category-1',
        status: 'draft',
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
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
        updatedAt: new Date('2026-04-17T00:00:00.000Z'),
        publishedAt: null,
        deletedAt: null,
      } as Article,
    ]);
    articleTagRepository = createRepositoryMock<ArticleTag>([
      {
        articleId: 'article-1',
        tagId: 'tag-1',
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
      } as ArticleTag,
      {
        articleId: 'article-1',
        tagId: 'tag-2',
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
      } as ArticleTag,
    ]);
    articleVersionRepository = createRepositoryMock<ArticleVersion>([]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleVersionsService,
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
        {
          provide: getRepositoryToken(ArticleTag),
          useValue: articleTagRepository,
        },
        {
          provide: getRepositoryToken(ArticleVersion),
          useValue: articleVersionRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(ArticleVersionsService);
  });

  it('应按文章递增生成版本号', async () => {
    await service.recordVersion(articleRepository.items[0], 'author-1', '创建文章');
    await service.recordVersion(
      {
        ...articleRepository.items[0],
        title: '更新后的标题',
      },
      'author-1',
      '更新文章',
    );

    expect(articleVersionRepository.items).toHaveLength(2);
    expect(articleVersionRepository.items.map(item => item.versionNo)).toEqual([1, 2]);
    expect(articleVersionRepository.items[1]).toEqual(
      expect.objectContaining({
        title: '更新后的标题',
        tagIds: ['tag-1', 'tag-2'],
        changeNote: '更新文章',
      }),
    );
  });

  it('恢复历史版本前应自动备份当前内容', async () => {
    articleVersionRepository.items.push(
      {
        id: 'version-1',
        articleId: 'article-1',
        versionNo: 1,
        title: '第一版标题',
        slug: 'current-slug',
        excerpt: '第一版摘要',
        content: '# 第一版内容',
        contentHtml: '<h1>第一版内容</h1>',
        coverImage: null,
        categoryId: 'category-1',
        status: 'draft',
        visibility: 'public',
        allowComment: true,
        isTop: false,
        sortOrder: 0,
        seoTitle: null,
        seoDescription: null,
        seoKeywords: null,
        scheduledAt: null,
        publishedAt: null,
        deletedAt: null,
        tagIds: ['tag-1'],
        operatorId: 'author-1',
        changeNote: '创建文章',
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
      } as ArticleVersion,
      {
        id: 'version-2',
        articleId: 'article-1',
        versionNo: 2,
        title: '第二版标题',
        slug: 'current-slug',
        excerpt: '第二版摘要',
        content: '# 第二版内容',
        contentHtml: '<h1>第二版内容</h1>',
        coverImage: null,
        categoryId: 'category-1',
        status: 'draft',
        visibility: 'public',
        allowComment: true,
        isTop: false,
        sortOrder: 0,
        seoTitle: null,
        seoDescription: null,
        seoKeywords: null,
        scheduledAt: null,
        publishedAt: null,
        deletedAt: null,
        tagIds: ['tag-1', 'tag-2'],
        operatorId: 'author-1',
        changeNote: '更新文章',
        createdAt: new Date('2026-04-17T01:00:00.000Z'),
      } as ArticleVersion,
    );
    articleRepository.items[0] = {
      ...articleRepository.items[0],
      title: '第二版标题',
      excerpt: '第二版摘要',
      content: '# 第二版内容',
      contentHtml: '<h1>第二版内容</h1>',
    };

    const restored = await service.restoreVersion(
      'article-1',
      'version-1',
      {
        id: 'author-1',
        role: 'admin',
      } as User,
      '回滚到第一版',
    );

    expect(restored).toEqual(
      expect.objectContaining({
        title: '第一版标题',
        content: '# 第一版内容',
      }),
    );
    expect(articleVersionRepository.items).toHaveLength(3);
    expect(articleVersionRepository.items[2]).toEqual(
      expect.objectContaining({
        versionNo: 3,
        title: '第二版标题',
        tagIds: ['tag-1', 'tag-2'],
        changeNote: '回滚到第一版',
      }),
    );
    expect(articleTagRepository.items.map(item => item.tagId)).toEqual(['tag-1']);
  });
});