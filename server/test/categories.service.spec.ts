import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, Category } from '@database/entities';
import { CategoriesService } from '../src/modules/categories/categories.service';

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

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? `cat-${items.length + 1}`,
    })),
    find: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
      }) => {
        return items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        );
      },
    ),
    findOne: jest.fn().mockImplementation(
      async (options: { where: Partial<T> | Array<Partial<T>> }) => {
        return (
          items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null
        );
      },
    ),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const index = entity.id ? items.findIndex(item => item.id === entity.id) : -1;
      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const saved = cloneValue({
        ...entity,
        id: entity.id ?? `cat-${items.length + 1}`,
      });
      items.push(saved);
      return saved;
    }),
    remove: jest.fn().mockImplementation(async (entity: T) => {
      const index = items.findIndex(item => item.id === entity.id);
      if (index >= 0) {
        items.splice(index, 1);
      }
      return entity;
    }),
    count: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
      }) => {
        return items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        ).length;
      },
    ),
  };
};

const NOW = new Date('2026-04-17T00:00:00.000Z');

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'category-1',
  name: '前端开发',
  slug: 'frontend',
  description: '前端技术文章',
  sortOrder: 0,
  articleCount: 0,
  isVisible: true,
  color: '#3498db',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepository: RepositoryMock<Category>;
  let articleRepository: RepositoryMock<Article>;

  beforeEach(async () => {
    categoryRepository = createRepositoryMock<Category>([
      makeCategory(),
      makeCategory({
        id: 'category-2',
        name: '后端开发',
        slug: 'backend',
        description: '后端技术文章',
        sortOrder: 1,
        isVisible: true,
        color: '#2ecc71',
      }),
      makeCategory({
        id: 'category-3',
        name: '隐藏分类',
        slug: 'hidden',
        description: null,
        sortOrder: 0,
        isVisible: false,
        color: '#000000',
      }),
    ]);

    articleRepository = createRepositoryMock<Article>([]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepository,
        },
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────

  it('should create a category with valid data', async () => {
    const result = await service.create({
      name: '  DevOps  ',
      slug: '  devops  ',
      description: '运维相关',
      sortOrder: 5,
      isVisible: true,
      color: '#e74c3c',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'DevOps',
        slug: 'devops',
        description: '运维相关',
        sortOrder: 5,
        isVisible: true,
        color: '#e74c3c',
      }),
    );
    expect(categoryRepository.items).toHaveLength(4);
  });

  it('should throw ConflictException if slug already exists', async () => {
    await expect(
      service.create({
        name: '另一个前端',
        slug: 'frontend',
      }),
    ).rejects.toThrow(ConflictException);
  });

  // ── findAll ─────────────────────────────────────────────────────

  it('should return all categories sorted by sortOrder then name', async () => {
    const categories = await service.findAll();

    expect(categories).toHaveLength(3);
    expect(categories[0].sortOrder).toBeLessThanOrEqual(categories[1].sortOrder);

    const sameOrder = categories.filter(c => c.sortOrder === 0);
    if (sameOrder.length > 1) {
      expect(sameOrder[0].name.localeCompare(sameOrder[1].name, 'zh-CN')).toBeLessThanOrEqual(0);
    }
  });

  it('should return only visible categories when visibleOnly is true', async () => {
    const categories = await service.findAll({ visibleOnly: true });

    expect(categories).toHaveLength(2);
    expect(categories.every(c => c.isVisible)).toBe(true);
  });

  // ── findById ────────────────────────────────────────────────────

  it('should return a category by ID', async () => {
    const category = await service.findById('category-1');

    expect(category).toEqual(expect.objectContaining({ id: 'category-1', slug: 'frontend' }));
  });

  it('should throw NotFoundException for non-existent ID', async () => {
    await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
  });

  // ── update ──────────────────────────────────────────────────────

  it('should update category fields', async () => {
    const updated = await service.update('category-1', {
      name: 'Web 前端',
      description: '更新后的描述',
      color: '#9b59b6',
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: 'category-1',
        name: 'Web 前端',
        slug: 'frontend',
        description: '更新后的描述',
        color: '#9b59b6',
      }),
    );
  });

  it('should throw ConflictException if new slug conflicts with another category', async () => {
    await expect(
      service.update('category-1', { slug: 'backend' }),
    ).rejects.toThrow(ConflictException);
  });

  // ── remove ──────────────────────────────────────────────────────

  it('should delete category with no articles', async () => {
    const result = await service.remove('category-2');

    expect(result).toEqual({ message: '分类删除成功' });
    expect(categoryRepository.items.find(c => c.id === 'category-2')).toBeUndefined();
  });

  it('should throw ConflictException when category has articles', async () => {
    articleRepository.items.push({
      id: 'article-1',
      title: '测试文章',
      slug: 'test-article',
      excerpt: null,
      content: '# content',
      contentHtml: null,
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
      createdAt: NOW,
      updatedAt: NOW,
      publishedAt: NOW,
      deletedAt: null,
    });

    await expect(service.remove('category-1')).rejects.toThrow(ConflictException);
  });
});
