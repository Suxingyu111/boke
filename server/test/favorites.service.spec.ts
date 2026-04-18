import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, Favorite } from '@database/entities';
import { FavoritesService } from '../src/modules/favorites/favorites.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

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
      id: payload.id ?? `fav-${items.length + 1}`,
    })),
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
        id: entity.id ?? `fav-${items.length + 1}`,
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
      async (options?: { where?: Partial<T> | Array<Partial<T>> }) => {
        return items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        ).length;
      },
    ),
    createQueryBuilder: jest.fn(),
  };
};

describe('FavoritesService', () => {
  let service: FavoritesService;
  let favoriteRepository: RepositoryMock<Favorite>;
  let articleRepository: RepositoryMock<Article>;

  beforeEach(async () => {
    articleRepository = createRepositoryMock<Article>([
      {
        id: 'article-1',
        title: '收藏测试文章',
        slug: 'favorites-test',
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
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
        updatedAt: new Date('2026-04-17T00:00:00.000Z'),
        publishedAt: new Date('2026-04-17T00:00:00.000Z'),
        deletedAt: null,
      },
    ]);

    favoriteRepository = createRepositoryMock<Favorite>([]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: favoriteRepository,
        },
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(FavoritesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addFavorite', () => {
    it('应为已发布文章添加收藏', async () => {
      const result = await service.addFavorite('user-1', 'article-1');

      expect(result).toEqual({ message: '收藏成功', articleId: 'article-1' });
      expect(favoriteRepository.items).toHaveLength(1);
      expect(favoriteRepository.items[0]).toEqual(
        expect.objectContaining({ userId: 'user-1', articleId: 'article-1' }),
      );
    });

    it('文章不存在时应抛出 NotFoundException', async () => {
      await expect(service.addFavorite('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('重复收藏时应抛出 ConflictException', async () => {
      await service.addFavorite('user-1', 'article-1');

      await expect(service.addFavorite('user-1', 'article-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeFavorite', () => {
    it('应移除已存在的收藏', async () => {
      await service.addFavorite('user-1', 'article-1');
      expect(favoriteRepository.items).toHaveLength(1);

      const result = await service.removeFavorite('user-1', 'article-1');

      expect(result).toEqual({ message: '已取消收藏', articleId: 'article-1' });
      expect(favoriteRepository.items).toHaveLength(0);
    });

    it('未收藏时应抛出 NotFoundException', async () => {
      await expect(service.removeFavorite('user-1', 'article-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isFavorited', () => {
    it('已收藏时应返回 true', async () => {
      await service.addFavorite('user-1', 'article-1');

      const result = await service.isFavorited('user-1', 'article-1');

      expect(result).toEqual({ favorited: true });
    });

    it('未收藏时应返回 false', async () => {
      const result = await service.isFavorited('user-1', 'article-1');

      expect(result).toEqual({ favorited: false });
    });
  });

  describe('batchCheckFavorited', () => {
    it('应返回文章 ID 到布尔值的映射', async () => {
      await service.addFavorite('user-1', 'article-1');

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(
          favoriteRepository.items.filter(f => f.userId === 'user-1'),
        ),
      };
      (favoriteRepository.createQueryBuilder as jest.Mock).mockReturnValue(queryBuilder);

      const result = await service.batchCheckFavorited('user-1', ['article-1', 'article-999']);

      expect(result).toEqual({ 'article-1': true, 'article-999': false });
      expect(favoriteRepository.createQueryBuilder).toHaveBeenCalledWith('f');
    });

    it('空数组时应返回空对象', async () => {
      const result = await service.batchCheckFavorited('user-1', []);

      expect(result).toEqual({});
      expect(favoriteRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
