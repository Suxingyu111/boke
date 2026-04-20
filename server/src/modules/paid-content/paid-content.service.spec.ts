import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, ArticlePurchase, PaidContent, User } from '@database/entities';
import { PaidContentService } from './paid-content.service';

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
      id: payload.id ?? `entity-${items.length + 1}`,
    })),
    findOne: jest.fn().mockImplementation(async (options: { where: Partial<T> | Array<Partial<T>> }) => {
      return items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null;
    }),
    findBy: jest.fn().mockImplementation(async (where: Partial<T>) => {
      return items.filter(item => matchWhere(item as Record<string, unknown>, where));
    }),
    find: jest.fn().mockResolvedValue(items),
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
    remove: jest.fn().mockImplementation(async (entity: T) => {
      const index = items.findIndex(item => item.id === entity.id);
      if (index >= 0) {
        items.splice(index, 1);
      }
      return entity;
    }),
  };
};

describe('PaidContentService', () => {
  let service: PaidContentService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PaidContentService,
        {
          provide: getRepositoryToken(PaidContent),
          useValue: createRepositoryMock<PaidContent>([
            {
              id: 'paid-1',
              articleId: 'article-1',
              price: 9.9,
              previewPercent: 30,
              isActive: true,
              description: 'desc',
            } as PaidContent,
          ]),
        },
        {
          provide: getRepositoryToken(ArticlePurchase),
          useValue: createRepositoryMock<ArticlePurchase>([]),
        },
        {
          provide: getRepositoryToken(Article),
          useValue: createRepositoryMock<Article>([
            {
              id: 'article-1',
              title: 'article',
              userId: 'author-1',
            } as Article,
          ]),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createRepositoryMock<User>([]),
        },
      ],
    }).compile();

    service = moduleRef.get(PaidContentService);
  });

  it('非文章作者的 author 角色不能设置付费内容', async () => {
    await expect(
      service.setPaidContent(
        'article-1',
        {
          price: 19.9,
        },
        {
          id: 'author-2',
          role: 'author',
        } as User,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('非文章作者的 author 角色不能删除付费配置', async () => {
    await expect(
      service.removePaidContent(
        'article-1',
        {
          id: 'author-2',
          role: 'author',
        } as User,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
