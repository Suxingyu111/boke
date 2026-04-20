import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { FriendLink, Page } from '@database/entities';
import { PagesService } from '../src/modules/pages/pages.service';

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
      id: payload.id ?? `id-${items.length + 1}`,
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
        id: entity.id ?? `id-${items.length + 1}`,
      });
      items.push(saved);
      return saved;
    }),
    remove: jest.fn().mockImplementation(async (entity: T) => {
      const index = items.findIndex(item => item.id === entity.id);
      if (index >= 0) {
        const [removed] = items.splice(index, 1);
        return removed;
      }
      return entity;
    }),
  };
};

describe('PagesService FriendLinks', () => {
  let service: PagesService;
  let friendLinkRepository: RepositoryMock<FriendLink>;
  let pageRepository: RepositoryMock<Page>;

  const now = new Date('2026-04-17T00:00:00.000Z');

  beforeEach(async () => {
    pageRepository = createRepositoryMock<Page>([]);
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
        PagesService,
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

    service = moduleRef.get(PagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findPublicFriendLinks 应仅返回已审核的友链并按 sortOrder 排序', async () => {
    const result = await service.findPublicFriendLinks();

    expect(result).toHaveLength(2);
    expect(result.every((link: FriendLink) => link.status === 'approved')).toBe(true);
    expect(result[0].sortOrder).toBeLessThanOrEqual(result[1].sortOrder);
  });

  it('applyFriendLink 应创建一条 pending 状态的友链', async () => {
    const result = await service.applyFriendLink({
      siteName: ' 新站点 ',
      siteUrl: ' https://new-site.com ',
      description: ' 新站点描述 ',
      contactEmail: ' new@example.com ',
      applicantName: ' 申请人 ',
    });

    expect(result).toEqual(
      expect.objectContaining({
        siteName: '新站点',
        status: 'pending',
      }),
    );

    const created = friendLinkRepository.items.find(item => item.siteName === '新站点');
    expect(created).toBeDefined();
    expect(created!.siteUrl).toBe('https://new-site.com');
    expect(created!.sortOrder).toBe(0);
  });

  it('findAdminFriendLinks 应返回全部友链', async () => {
    const result = await service.findAdminFriendLinks();
    expect(result).toHaveLength(4);
  });

  it('updateFriendLink 审核通过时应设置 approved 状态和 approvedAt', async () => {
    const result = await service.updateFriendLink('link-pending', { status: 'approved' });

    expect(result.status).toBe('approved');
    expect(result.approvedAt).toBeDefined();
  });

  it('updateFriendLink 拒绝时应设置 rejected 状态', async () => {
    const result = await service.updateFriendLink('link-pending', { status: 'rejected' });

    expect(result.status).toBe('rejected');
    expect(result.approvedAt).toBeNull();
  });

  it('updateFriendLink 应更新友链字段', async () => {
    const result = await service.updateFriendLink('link-approved-1', {
      siteName: '更新后的站点名',
      siteUrl: 'https://updated-site.com',
      sortOrder: 10,
    });

    expect(result.siteName).toBe('更新后的站点名');
    expect(result.siteUrl).toBe('https://updated-site.com');
    expect(result.sortOrder).toBe(10);
  });

  it('removeFriendLink 应删除友链', async () => {
    const result = await service.removeFriendLink('link-rejected');

    expect(result).toEqual({ message: '友链删除成功' });
    expect(friendLinkRepository.items.find(item => item.id === 'link-rejected')).toBeUndefined();
  });

  it('removeFriendLink 不存在时应抛出 NotFoundException', async () => {
    await expect(service.removeFriendLink('non-existent')).rejects.toThrow(NotFoundException);
  });
});
