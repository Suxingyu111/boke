import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User, Favorite, Article, Guestbook } from '@database/entities';
import { UsersService } from '../src/modules/users/users.service';
import { MediaAssetsService } from '../src/modules/media-assets/media-assets.service';

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

    if (leftValue === rightValue) return 0;
    if (leftValue === null || leftValue === undefined) return 1;
    if (rightValue === null || rightValue === undefined) return -1;

    const leftComparable = leftValue instanceof Date ? leftValue.getTime() : leftValue;
    const rightComparable = rightValue instanceof Date ? rightValue.getTime() : rightValue;

    if (leftComparable < rightComparable) return orderDirection === 'ASC' ? -1 : 1;
    return orderDirection === 'ASC' ? 1 : -1;
  });
};

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    find: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
      }) => {
        const matched = items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        );
        return applyOrder(matched, options?.order as Partial<Record<string, 'ASC' | 'DESC'>>);
      },
    ),
    findAndCount: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<keyof T, 'ASC' | 'DESC'>>;
        skip?: number;
        take?: number;
      }) => {
        const matched = applyOrder(
          items.filter(item => matchWhere(item as Record<string, unknown>, options?.where)),
          options?.order as Partial<Record<string, 'ASC' | 'DESC'>>,
        );
        const skip = options?.skip ?? 0;
        const take = options?.take ?? matched.length;
        return [matched.slice(skip, skip + take), matched.length];
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
      const saved = cloneValue({ ...entity, id: entity.id ?? `gen-${items.length + 1}` });
      items.push(saved);
      return saved;
    }),
    count: jest.fn().mockImplementation(
      async (options?: { where?: Partial<T> | Array<Partial<T>> }) => {
        return items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        ).length;
      },
    ),
    update: jest.fn().mockImplementation(async (id: string, partial: Partial<T>) => {
      const index = items.findIndex(item => item.id === id);
      if (index >= 0) {
        Object.assign(items[index], partial);
      }
      return { affected: index >= 0 ? 1 : 0, raw: {} };
    }),
    createQueryBuilder: jest.fn(),
  };
};

// ── seed data ──────────────────────────────────────────────────────────

const HASHED_PASSWORD = bcrypt.hashSync('OldPass123', 10);

const seedUser: User = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  password: HASHED_PASSWORD,
  nickname: '测试用户',
  avatar: 'https://example.com/avatar.png',
  bio: '这是个人简介',
  isActive: true,
  role: 'user',
  lastLoginAt: null,
  createdAt: new Date('2026-04-17T00:00:00.000Z'),
  updatedAt: new Date('2026-04-17T00:00:00.000Z'),
};

const seedCategory: Category = {
  id: 'category-1',
  name: '前端',
  slug: 'frontend',
  description: null,
  sortOrder: 0,
  articleCount: 1,
  isVisible: true,
  color: '#000000',
  createdAt: new Date('2026-04-17T00:00:00.000Z'),
  updatedAt: new Date('2026-04-17T00:00:00.000Z'),
};

import { Category } from '@database/entities';

const seedAuthor: User = {
  id: 'author-1',
  username: 'author',
  email: 'author@example.com',
  password: '',
  nickname: '博主',
  avatar: 'https://example.com/author.png',
  bio: null,
  isActive: true,
  role: 'author',
  lastLoginAt: null,
  createdAt: new Date('2026-04-17T00:00:00.000Z'),
  updatedAt: new Date('2026-04-17T00:00:00.000Z'),
};

const seedArticle: Article = {
  id: 'article-1',
  title: '测试文章',
  slug: 'test-article',
  excerpt: '摘要内容',
  content: '# 正文',
  contentHtml: null,
  coverImage: 'https://example.com/cover.jpg',
  categoryId: 'category-1',
  category: seedCategory,
  status: 'published',
  visibility: 'public',
  allowComment: true,
  isTop: false,
  sortOrder: 0,
  viewCount: 100,
  likes: 5,
  commentCount: 2,
  seoTitle: null,
  seoDescription: null,
  seoKeywords: null,
  userId: 'author-1',
  author: seedAuthor,
  scheduledAt: null,
  createdAt: new Date('2026-04-17T00:00:00.000Z'),
  updatedAt: new Date('2026-04-17T00:00:00.000Z'),
  publishedAt: new Date('2026-04-17T00:00:00.000Z'),
  deletedAt: null,
};

const seedFavorite: Favorite = {
  id: 'fav-1',
  userId: 'user-1',
  user: seedUser,
  articleId: 'article-1',
  article: seedArticle,
  createdAt: new Date('2026-04-18T00:00:00.000Z'),
};

const seedGuestbook: Guestbook = {
  id: 'gb-1',
  nickname: '测试用户',
  email: 'test@example.com',
  website: null,
  avatarUrl: null,
  content: '留言内容',
  parentId: null,
  ip: '127.0.0.1',
  status: 'approved',
  isAdminReply: false,
  createdAt: new Date('2026-04-17T00:00:00.000Z'),
};

// ── tests ──────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: RepositoryMock<User>;
  let favoriteRepository: RepositoryMock<Favorite>;
  let articleRepository: RepositoryMock<Article>;
  let guestbookRepository: RepositoryMock<Guestbook>;
  let mediaAssetsService: Pick<MediaAssetsService, 'upload'>;

  beforeEach(async () => {
    userRepository = createRepositoryMock<User>([seedUser]);
    favoriteRepository = createRepositoryMock<Favorite>([seedFavorite]);
    articleRepository = createRepositoryMock<Article>([seedArticle]);
    guestbookRepository = createRepositoryMock<Guestbook>([seedGuestbook]);
    mediaAssetsService = {
      upload: jest.fn(),
    };

    // wire createQueryBuilder for changePassword (select hidden password field)
    (userRepository.createQueryBuilder as jest.Mock).mockImplementation(() => {
      let targetId: string | undefined;
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation((_cond: string, params: { id: string }) => {
          targetId = params.id;
          return qb;
        }),
        getOne: jest.fn().mockImplementation(async () => {
          return (
            userRepository.items.find(u => u.id === targetId) ?? null
          );
        }),
      };
      return qb;
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Favorite), useValue: favoriteRepository },
        { provide: getRepositoryToken(Article), useValue: articleRepository },
        { provide: getRepositoryToken(Guestbook), useValue: guestbookRepository },
        { provide: MediaAssetsService, useValue: mediaAssetsService },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getProfile ─────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return user profile with favorites and comments count', async () => {
      const result = await service.getProfile('user-1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          nickname: '测试用户',
          avatar: 'https://example.com/avatar.png',
          bio: '这是个人简介',
          role: 'user',
          favoriteCount: 1,
          commentCount: 1,
        }),
      );
      expect(result.createdAt).toBeDefined();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateProfile ──────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('should update nickname, avatar, bio', async () => {
      const result = await service.updateProfile('user-1', {
        nickname: '新昵称',
        avatar: 'https://example.com/new-avatar.png',
        bio: '新的个人简介',
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'user-1',
          nickname: '新昵称',
          avatar: 'https://example.com/new-avatar.png',
          bio: '新的个人简介',
        }),
      );

      // verify the in-memory store was updated
      expect(userRepository.items[0].nickname).toBe('新昵称');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        service.updateProfile('non-existent', { nickname: '不存在' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── changePassword ─────────────────────────────────────────────────

  describe('changePassword', () => {
    it('should change password when old password is correct', async () => {
      const result = await service.changePassword('user-1', {
        oldPassword: 'OldPass123',
        newPassword: 'NewPass456',
      });

      expect(result).toEqual({ message: '密码修改成功' });

      // verify the stored hash was replaced
      const updatedHash = userRepository.items[0].password;
      expect(await bcrypt.compare('NewPass456', updatedHash)).toBe(true);
    });

    it('should throw BadRequestException when old password is wrong', async () => {
      await expect(
        service.changePassword('user-1', {
          oldPassword: 'WrongPassword',
          newPassword: 'NewPass456',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getFavoriteArticles ────────────────────────────────────────────

  describe('getFavoriteArticles', () => {
    it('should return paginated favorited articles', async () => {
      const result = await service.getFavoriteArticles('user-1', 1, 20);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(1);

      const item = result.items[0];
      expect(item.id).toBe('fav-1');
      expect(item.article).toEqual(
        expect.objectContaining({
          id: 'article-1',
          title: '测试文章',
          slug: 'test-article',
          excerpt: '摘要内容',
          coverImage: 'https://example.com/cover.jpg',
          viewCount: 100,
        }),
      );
      expect(item.article.author).toEqual(
        expect.objectContaining({
          id: 'author-1',
          username: 'author',
          nickname: '博主',
        }),
      );
    });
  });
});
