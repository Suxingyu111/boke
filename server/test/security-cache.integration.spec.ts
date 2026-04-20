import 'reflect-metadata';
import { Controller, Get, INestApplication, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { NoStoreResponse } from '../src/common/security/decorators/no-store-response.decorator';
import { ResponseCache } from '../src/common/security/decorators/response-cache.decorator';
import { ResponseCacheInterceptor } from '../src/common/security/response-cache.interceptor';
import { ResponseCacheService } from '../src/common/security/response-cache.service';
import { ResponseSecurityInterceptor } from '../src/common/security/response-security.interceptor';

const buildPatternRegex = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:/g, ':')}$`,
  );

const createRedisClientMock = () => {
  const store = new Map<string, string>();

  return {
    store,
    clear: () => store.clear(),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        store.delete(key);
      }
      return 1;
    }),
    scan: jest.fn(async (_cursor: number, options?: { MATCH?: string }) => {
      const regex = buildPatternRegex(options?.MATCH ?? '*');
      return {
        cursor: 0,
        keys: [...store.keys()].filter(key => regex.test(key)),
      };
    }),
  };
};

@Injectable()
class CacheProbeService {
  private counter = 0;

  getCachedPayload(): { value: number } {
    this.counter += 1;
    return { value: this.counter };
  }

  getPrivatePayload(): { secret: string } {
    return { secret: 'only-live' };
  }

  reset(): void {
    this.counter = 0;
  }
}

@Controller()
class CacheProbeController {
  constructor(private readonly cacheProbeService: CacheProbeService) {}

  @Get('public/cache')
  @ResponseCache({ keyPrefix: 'probe:public', ttlSeconds: 120, clientTtlSeconds: 60 })
  getCachedPayload() {
    return this.cacheProbeService.getCachedPayload();
  }

  @Get('private/cache')
  @NoStoreResponse()
  getPrivatePayload() {
    return this.cacheProbeService.getPrivatePayload();
  }
}

describe('Security cache integration', () => {
  let app: INestApplication;
  let cacheProbeService: CacheProbeService;
  let redisClient: ReturnType<typeof createRedisClientMock>;

  beforeAll(async () => {
    redisClient = createRedisClientMock();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CacheProbeController],
      providers: [
        CacheProbeService,
        ResponseCacheService,
        ResponseSecurityInterceptor,
        ResponseCacheInterceptor,
        Reflector,
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
                'cache.keyNamespace': 'integration-cache',
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

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(
      moduleRef.get(ResponseSecurityInterceptor),
      new ResponseInterceptor(),
      moduleRef.get(ResponseCacheInterceptor),
    );
    await app.init();

    cacheProbeService = moduleRef.get(CacheProbeService);
  });

  beforeEach(() => {
    cacheProbeService.reset();
    redisClient.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('公开缓存接口应在重复访问时返回 HIT', async () => {
    const first = await request(app.getHttpServer()).get('/api/public/cache').expect(200);
    const second = await request(app.getHttpServer()).get('/api/public/cache').expect(200);

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(first.headers['cache-control']).toContain('public');
    expect(redisClient.store.size).toBeGreaterThan(0);
    expect(second.body.data).toEqual({ value: 1 });
  });

  it('敏感接口应返回 no-store 头并跳过缓存', async () => {
    const response = await request(app.getHttpServer()).get('/api/private/cache').expect(200);

    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['x-cache']).toBeUndefined();
  });

  it('携带鉴权头访问公开接口时应跳过缓存并禁用存储', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/cache')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['x-cache']).toBeUndefined();
    expect(response.body.data).toEqual({ value: 1 });
  });
});
