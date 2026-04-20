import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, CommentEntity, User } from '@database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';
import { CommentsService } from './comments.service';

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

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? `comment-${items.length + 1}`,
    })),
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

      const saved = cloneValue({
        ...entity,
        id: entity.id ?? `comment-${items.length + 1}`,
      });
      items.push(saved);
      return saved;
    }),
    delete: jest.fn().mockImplementation(async (criteria: Partial<T> | string) => {
      const normalizedCriteria =
        typeof criteria === 'string'
          ? ({ id: criteria } as Partial<T>)
          : criteria;
      const index = items.findIndex(item =>
        Object.entries(normalizedCriteria).every(
          ([key, value]) => (item as Record<string, unknown>)[key] === value,
        ),
      );

      if (index >= 0) {
        items.splice(index, 1);
      }

      return { affected: index >= 0 ? 1 : 0, raw: {} };
    }),
  };
};

describe('CommentsService', () => {
  let service: CommentsService;
  let articleRepository: RepositoryMock<Article>;
  let commentRepository: RepositoryMock<CommentEntity>;
  let userRepository: RepositoryMock<User>;
  const notificationsService = {
    sendCommentNotification: jest.fn(),
  };
  const userNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    articleRepository = createRepositoryMock<Article>([
      {
        id: 'article-1',
        title: '评论模块测试',
        slug: 'comment-module-test',
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
    commentRepository = createRepositoryMock<CommentEntity>([
      {
        id: 'comment-root',
        articleId: 'article-1',
        parentId: null,
        userId: 'user-1',
        authorName: '普通用户',
        authorEmail: 'member@example.com',
        authorWebsite: null,
        content: '原始评论',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        likeCount: 0,
        status: 'approved',
        repliedAt: null,
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
        updatedAt: new Date('2026-04-17T00:00:00.000Z'),
        deletedAt: null,
        article: null as unknown as CommentEntity['article'],
        user: null as unknown as CommentEntity['user'],
        parent: null as unknown as CommentEntity['parent'],
      },
    ]);
    userRepository = createRepositoryMock<User>([
      {
        id: 'author-1',
        username: 'author',
        email: 'author@example.com',
        phone: null,
        password: '',
        nickname: '博主',
        registrationType: 'email',
        emailVerifiedAt: new Date('2026-04-18T00:00:00.000Z'),
        phoneVerifiedAt: null,
        avatar: null,
        bio: null,
        isActive: true,
        role: 'author',
        lastLoginAt: null,
        passwordChangedAt: new Date('2026-04-18T00:00:00.000Z'),
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
        updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      },
    ]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(CommentEntity),
          useValue: commentRepository,
        },
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: UserNotificationsService,
          useValue: userNotificationsService,
        },
      ],
    }).compile();

    service = moduleRef.get(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('登录用户提交评论时应使用当前用户身份并通知文章作者', async () => {
    await service.createComment(
      'article-1',
      {
        authorName: '伪造昵称',
        authorEmail: 'fake@example.com',
        authorWebsite: 'https://example.com',
        content: '登录用户评论',
      },
      '127.0.0.1',
      'jest-agent',
      {
        id: 'user-1',
        username: 'member',
        email: 'member@example.com',
        phone: null,
        password: '',
        nickname: '真实昵称',
        registrationType: 'email',
        emailVerifiedAt: new Date('2026-04-18T00:00:00.000Z'),
        phoneVerifiedAt: null,
        avatar: null,
        bio: null,
        isActive: true,
        role: 'user',
        lastLoginAt: null,
        passwordChangedAt: new Date('2026-04-18T00:00:00.000Z'),
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
        updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      },
    );

    const created = commentRepository.items.find(item => item.id === 'comment-2');

    expect(created).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        authorName: '真实昵称',
        authorEmail: 'member@example.com',
        status: 'pending',
      }),
    );
    expect(notificationsService.sendCommentNotification).toHaveBeenCalledWith(
      'author@example.com',
      '评论模块测试',
      '真实昵称',
    );
  });

  it('管理员回复已登录用户评论时应创建站内通知并增加评论数', async () => {
    await service.adminReply(
      'comment-root',
      { content: '这是管理员回复。' },
      {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        phone: null,
        password: '',
        nickname: '管理员',
        registrationType: 'email',
        emailVerifiedAt: new Date('2026-04-18T00:00:00.000Z'),
        phoneVerifiedAt: null,
        avatar: null,
        bio: null,
        isActive: true,
        role: 'admin',
        lastLoginAt: null,
        passwordChangedAt: new Date('2026-04-18T00:00:00.000Z'),
        createdAt: new Date('2026-04-17T00:00:00.000Z'),
        updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      },
    );

    expect(articleRepository.items[0].commentCount).toBe(1);
    expect(userNotificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'comment_reply',
        relatedId: 'comment-root',
      }),
    );
  });
});