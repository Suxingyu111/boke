import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { FriendLink } from '@database/entities';
import { FriendLinksService } from '../src/modules/friend-links/friend-links.service';

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
      id: payload.id ?? `link-${items.length + 1}`,
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
        id: entity.id ?? `link-${items.length + 1}`,
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

describe('FriendLinksService', () => {
  let service: FriendLinksService;
  let friendLinkRepository: RepositoryMock<FriendLink>;

  const now = new Date('2026-04-17T00:00:00.000Z');

  beforeEach(async () => {
    friendLinkRepository = createRepositoryMock<FriendLink>([
      {
        id: 'link-approved-1',
        siteName: '站点A',
        siteUrl: 'https://site-a.com',
        logoUrl: null,
        description: '站点A描述',
        contactEmail: 'a@example.com',
        applicantName: '申请人A',
        sortOrder: 1,
        status: 'approved',
        approvedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'link-approved-2',
        siteName: '站点B',
        siteUrl: 'https://site-b.com',
        logoUrl: 'https://site-b.com/logo.png',
        description: '站点B描述',
        contactEmail: null,
        applicantName: null,
        sortOrder: 0,
        status: 'approved',
        approvedAt: now,
        createdAt: new Date('2026-04-16T00:00:00.000Z'),
        updatedAt: new Date('2026-04-16T00:00:00.000Z'),
      },
      {
        id: 'link-pending',
        siteName: '站点C',
        siteUrl: 'https://site-c.com',
        logoUrl: null,
        description: null,
        contactEmail: 'c@example.com',
        applicantName: '申请人C',
        sortOrder: 0,
        status: 'pending',
        approvedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'link-rejected',
        siteName: '站点D',
        siteUrl: 'https://site-d.com',
        logoUrl: null,
        description: null,
        contactEmail: null,
        applicantName: null,
        sortOrder: 0,
        status: 'rejected',
        approvedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FriendLinksService,
        {
          provide: getRepositoryToken(FriendLink),
          useValue: friendLinkRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(FriendLinksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getApprovedLinks 应仅返回已审核的友链并按 sortOrder 排序', async () => {
    const result = await service.getApprovedLinks();

    expect(result).toHaveLength(2);
    expect(result.every(link => link.status === 'approved')).toBe(true);
    expect(result[0].sortOrder).toBeLessThanOrEqual(result[1].sortOrder);
  });

  it('applyLink 应创建一条 pending 状态的友链', async () => {
    const result = await service.applyLink({
      siteName: ' 新站点 ',
      siteUrl: ' https://new-site.com ',
      logoUrl: ' https://new-site.com/logo.png ',
      description: ' 新站点描述 ',
      contactEmail: ' new@example.com ',
      applicantName: ' 申请人 ',
    });

    expect(result).toEqual(
      expect.objectContaining({
        siteName: '新站点',
        message: '友链申请提交成功，等待审核',
      }),
    );

    const created = friendLinkRepository.items.find(item => item.siteName === '新站点');
    expect(created).toBeDefined();
    expect(created!.status).toBe('pending');
    expect(created!.siteUrl).toBe('https://new-site.com');
    expect(created!.logoUrl).toBe('https://new-site.com/logo.png');
    expect(created!.sortOrder).toBe(0);
  });

  it('adminGetLinks 无状态筛选时应返回全部友链', async () => {
    const result = await service.adminGetLinks();

    expect(result).toHaveLength(4);
  });

  it('adminGetLinks 按状态筛选时应只返回匹配的友链', async () => {
    const result = await service.adminGetLinks('pending');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('link-pending');
  });

  it('reviewLink 审核通过时应设置 approved 状态和 approvedAt', async () => {
    const result = await service.reviewLink('link-pending', 'approved');

    expect(result).toEqual({ message: '友链已通过' });

    const updated = friendLinkRepository.items.find(item => item.id === 'link-pending');
    expect(updated!.status).toBe('approved');
    expect(updated!.approvedAt).toBeDefined();
  });

  it('reviewLink 拒绝时应设置 rejected 状态', async () => {
    const result = await service.reviewLink('link-pending', 'rejected');

    expect(result).toEqual({ message: '友链已拒绝' });

    const updated = friendLinkRepository.items.find(item => item.id === 'link-pending');
    expect(updated!.status).toBe('rejected');
  });

  it('updateLink 应更新友链字段', async () => {
    const result = await service.updateLink('link-approved-1', {
      siteName: '更新后的站点名',
      siteUrl: 'https://updated-site.com',
      sortOrder: 10,
    });

    expect(result.siteName).toBe('更新后的站点名');
    expect(result.siteUrl).toBe('https://updated-site.com');
    expect(result.sortOrder).toBe(10);
  });

  it('deleteLink 应删除友链', async () => {
    const result = await service.deleteLink('link-rejected');

    expect(result).toEqual({ message: '友链已删除' });
    expect(friendLinkRepository.items.find(item => item.id === 'link-rejected')).toBeUndefined();
  });

  it('deleteLink 不存在时应抛出 NotFoundException', async () => {
    await expect(service.deleteLink('non-existent')).rejects.toThrow(NotFoundException);
  });
});
