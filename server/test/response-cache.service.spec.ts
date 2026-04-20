import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResponseCacheService } from '../src/common/security/response-cache.service';

type RedisStore = Map<string, string>;

const buildPatternRegex = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:/g, ':')}$`,
  );

const createRedisClientMock = () => {
  const store: RedisStore = new Map();

  return {
    store,
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async (keys: string | string[]) => {
      const normalizedKeys = Array.isArray(keys) ? keys : [keys];
      for (const key of normalizedKeys) {
        store.delete(key);
      }
      return normalizedKeys.length;
    }),
    scan: jest.fn(async (_cursor: number, options?: { MATCH?: string }) => {
      const regex = buildPatternRegex(options?.MATCH ?? '*');
      const keys = [...store.keys()].filter(key => regex.test(key));
      return { cursor: 0, keys };
    }),
  };
};

describe('ResponseCacheService', () => {
  let service: ResponseCacheService;
  let redisClient: ReturnType<typeof createRedisClientMock>;

  beforeEach(async () => {
    redisClient = createRedisClientMock();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseCacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: redisClient,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                'cache.enabled': true,
                'cache.keyNamespace': 'test-cache',
                'cache.nullTtlSeconds': 15,
                'cache.lockTtlMs': 1000,
                'cache.waitTimeoutMs': 100,
                'cache.ttlJitterSeconds': 0,
              };

              return key in config ? config[key] : defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ResponseCacheService);
  });

  it('缓存命中后应避免重复回源', async () => {
    const producer = jest.fn().mockResolvedValue({ slug: 'cache-hit' });
    const cacheKey = service.createCacheKey('articles:list', 'GET:/api/articles');

    const first = await service.getOrSet(cacheKey, producer, { ttlSeconds: 60 });
    const second = await service.getOrSet(cacheKey, producer, { ttlSeconds: 60 });

    expect(first.source).toBe('miss');
    expect(second.source).toBe('hit');
    expect(second.value).toEqual({ slug: 'cache-hit' });
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('应缓存 not found 结果以防止缓存穿透', async () => {
    const initialProducer = jest
      .fn()
      .mockRejectedValue(new NotFoundException('文章不存在'));
    const cacheKey = service.createCacheKey('pages:detail', 'GET:/api/pages/missing');

    await expect(
      service.getOrSet(cacheKey, initialProducer, {
        ttlSeconds: 60,
        cacheNotFound: true,
      }),
    ).rejects.toThrow('文章不存在');

    const secondProducer = jest.fn().mockResolvedValue({ shouldNotRun: true });

    await expect(
      service.getOrSet(cacheKey, secondProducer, {
        ttlSeconds: 60,
        cacheNotFound: true,
      }),
    ).rejects.toThrow('文章不存在');

    expect(initialProducer).toHaveBeenCalledTimes(1);
    expect(secondProducer).not.toHaveBeenCalled();
  });

  it('应支持按前缀失效缓存', async () => {
    const articleListKey = service.createCacheKey('articles:list', 'GET:/api/articles');
    const categoryKey = service.createCacheKey('categories:public', 'GET:/api/categories');

    redisClient.store.set(
      articleListKey,
      JSON.stringify({ kind: 'value', cachedAt: new Date().toISOString(), value: { ok: true } }),
    );
    redisClient.store.set(
      categoryKey,
      JSON.stringify({ kind: 'value', cachedAt: new Date().toISOString(), value: { ok: true } }),
    );

    await service.invalidatePrefixes(['articles:list']);

    expect(redisClient.store.has(articleListKey)).toBe(false);
    expect(redisClient.store.has(categoryKey)).toBe(true);
  });
});
