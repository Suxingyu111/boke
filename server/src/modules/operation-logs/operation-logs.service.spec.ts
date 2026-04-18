import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { OperationLog } from '@database/entities';
import { OperationLogsService } from './operation-logs.service';

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

const createRepositoryMock = <T extends ObjectLiteral & { id?: string | number }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? items.length + 1,
    })),
    findAndCount: jest.fn().mockImplementation(async (options?: { where?: Partial<T> | Array<Partial<T>>; skip?: number; take?: number }) => {
      const matched = items.filter(item => matchWhere(item as Record<string, unknown>, options?.where));
      const skip = options?.skip ?? 0;
      const take = options?.take ?? matched.length;

      return [matched.slice(skip, skip + take), matched.length];
    }),
    save: jest.fn().mockImplementation(async (entity: T) => {
      items.push(cloneValue(entity));
      return entity;
    }),
  };
};

describe('OperationLogsService', () => {
  let service: OperationLogsService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OperationLogsService,
        {
          provide: getRepositoryToken(OperationLog),
          useValue: createRepositoryMock<OperationLog>([
            {
              id: 1,
              operatorId: 'admin-1',
              moduleName: 'articles',
              actionName: 'create',
              targetType: 'article',
              targetId: 'article-1',
              requestMethod: 'POST',
              requestPath: '/api/admin/articles',
              requestPayload: { title: 'A' },
              responseCode: 201,
              ipAddress: '127.0.0.1',
              userAgent: 'jest',
              createdAt: new Date('2026-04-18T00:00:00.000Z'),
            } as OperationLog,
            {
              id: 2,
              operatorId: 'admin-1',
              moduleName: 'articles',
              actionName: 'export',
              targetType: 'article',
              targetId: 'article-1',
              requestMethod: 'GET',
              requestPath: '/api/admin/articles/article-1/export',
              requestPayload: { format: 'markdown' },
              responseCode: 200,
              ipAddress: '127.0.0.1',
              userAgent: 'jest',
              createdAt: new Date('2026-04-18T00:10:00.000Z'),
            } as OperationLog,
          ]),
        },
      ],
    }).compile();

    service = moduleRef.get(OperationLogsService);
  });

  it('应支持按模块和动作过滤日志列表', async () => {
    const result = await service.list({
      page: 1,
      pageSize: 10,
      moduleName: 'articles',
      actionName: 'export',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        moduleName: 'articles',
        actionName: 'export',
      }),
    );
  });
});