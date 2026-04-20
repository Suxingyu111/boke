import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RedisClientType } from 'redis';
import {
  DEFAULT_CACHE_KEY_NAMESPACE,
  DEFAULT_CACHE_LOCK_TTL_MS,
  DEFAULT_CACHE_TTL_JITTER_SECONDS,
  DEFAULT_CACHE_WAIT_TIMEOUT_MS,
  DEFAULT_NULL_CACHE_TTL_SECONDS,
} from './security.constants';

type CachedValueEntry<T> = {
  kind: 'value';
  cachedAt: string;
  value: T;
};

type CachedNotFoundEntry = {
  kind: 'not-found';
  cachedAt: string;
  message: string;
};

type CachedEntry<T> = CachedValueEntry<T> | CachedNotFoundEntry;

export interface CacheFetchOptions {
  ttlSeconds: number;
  nullTtlSeconds?: number;
  lockTtlMs?: number;
  waitTimeoutMs?: number;
  cacheNotFound?: boolean;
}

export interface CacheFetchResult<T> {
  source: 'hit' | 'miss' | 'bypass';
  value: T;
}

@Injectable()
export class ResponseCacheService {
  private readonly logger = new Logger(ResponseCacheService.name);

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Pick<RedisClientType, 'get' | 'set' | 'del' | 'scan'>,
    private readonly configService: ConfigService,
  ) {}

  createCacheKey(keyPrefix: string, identifier: string): string {
    const namespace = this.configService.get<string>(
      'cache.keyNamespace',
      DEFAULT_CACHE_KEY_NAMESPACE,
    );
    const hashValue = createHash('sha256').update(identifier).digest('hex');
    return `${namespace}:${keyPrefix}:${hashValue}`;
  }

  async getOrSet<T>(
    cacheKey: string,
    producer: () => Promise<T>,
    options: CacheFetchOptions,
  ): Promise<CacheFetchResult<T>> {
    if (!this.isCacheEnabled()) {
      return {
        source: 'bypass',
        value: await producer(),
      };
    }

    const cachedEntry = await this.readEntry<T>(cacheKey);
    if (cachedEntry) {
      return {
        source: 'hit',
        value: this.unwrapEntry(cachedEntry),
      };
    }

    const lockKey = `${cacheKey}:lock`;
    const lockTtlMs = options.lockTtlMs ?? this.getDefaultLockTtlMs();
    const waitTimeoutMs = options.waitTimeoutMs ?? this.getDefaultWaitTimeoutMs();
    const acquiredLock = await this.tryAcquireLock(lockKey, lockTtlMs);

    if (!acquiredLock) {
      const waitedEntry = await this.waitForExistingValue<T>(cacheKey, waitTimeoutMs);
      if (waitedEntry) {
        return {
          source: 'hit',
          value: this.unwrapEntry(waitedEntry),
        };
      }

      return {
        source: 'bypass',
        value: await producer(),
      };
    }

    try {
      const value = await producer();
      await this.writeValue(cacheKey, value, options.ttlSeconds);
      return {
        source: 'miss',
        value,
      };
    } catch (error) {
      if (options.cacheNotFound && error instanceof NotFoundException) {
        const nullTtlSeconds = options.nullTtlSeconds ?? this.getDefaultNullCacheTtlSeconds();
        await this.writeNotFound(cacheKey, error.message, nullTtlSeconds);
      }

      throw error;
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  async invalidatePrefixes(prefixes: string[]): Promise<void> {
    if (!this.isCacheEnabled()) {
      return;
    }

    const namespace = this.configService.get<string>(
      'cache.keyNamespace',
      DEFAULT_CACHE_KEY_NAMESPACE,
    );
    const uniquePrefixes = [...new Set(prefixes.map(prefix => prefix.trim()).filter(Boolean))];

    for (const prefix of uniquePrefixes) {
      let cursor = 0;

      do {
        const scanResult = await this.redisClient.scan(cursor, {
          MATCH: `${namespace}:${prefix}:*`,
          COUNT: 100,
        });

        cursor = Number(scanResult.cursor);
        if (scanResult.keys.length > 0) {
          await this.redisClient.del(scanResult.keys);
        }
      } while (cursor !== 0);
    }
  }

  private async readEntry<T>(cacheKey: string): Promise<CachedEntry<T> | null> {
    try {
      const rawValue = await this.redisClient.get(cacheKey);
      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue) as CachedEntry<T>;
    } catch (error) {
      this.logger.warn(`读取缓存失败，将回退源数据: ${(error as Error).message}`);
      return null;
    }
  }

  private unwrapEntry<T>(entry: CachedEntry<T>): T {
    if (entry.kind === 'not-found') {
      throw new NotFoundException(entry.message);
    }

    return entry.value;
  }

  private async writeValue<T>(cacheKey: string, value: T, ttlSeconds: number): Promise<void> {
    const payload: CachedValueEntry<T> = {
      kind: 'value',
      cachedAt: new Date().toISOString(),
      value,
    };
    await this.writeEntry(cacheKey, payload, ttlSeconds);
  }

  private async writeNotFound(
    cacheKey: string,
    message: string,
    ttlSeconds: number,
  ): Promise<void> {
    const payload: CachedNotFoundEntry = {
      kind: 'not-found',
      cachedAt: new Date().toISOString(),
      message,
    };
    await this.writeEntry(cacheKey, payload, ttlSeconds);
  }

  private async writeEntry<T>(
    cacheKey: string,
    payload: CachedEntry<T>,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redisClient.set(cacheKey, JSON.stringify(payload), {
        EX: this.applyTtlJitter(ttlSeconds),
      });
    } catch (error) {
      this.logger.warn(`写入缓存失败，请求将继续返回实时结果: ${(error as Error).message}`);
    }
  }

  private async tryAcquireLock(lockKey: string, ttlMs: number): Promise<boolean> {
    try {
      const result = await this.redisClient.set(lockKey, '1', {
        PX: ttlMs,
        NX: true,
      });
      return result === 'OK';
    } catch (error) {
      this.logger.warn(`缓存互斥锁获取失败，将直接回退源数据: ${(error as Error).message}`);
      return false;
    }
  }

  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.redisClient.del(lockKey);
    } catch (error) {
      this.logger.warn(`缓存互斥锁释放失败: ${(error as Error).message}`);
    }
  }

  private async waitForExistingValue<T>(
    cacheKey: string,
    waitTimeoutMs: number,
  ): Promise<CachedEntry<T> | null> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < waitTimeoutMs) {
      await this.delay(50);
      const cachedEntry = await this.readEntry<T>(cacheKey);
      if (cachedEntry) {
        return cachedEntry;
      }
    }

    return null;
  }

  private delay(timeoutMs: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, timeoutMs);
    });
  }

  private isCacheEnabled(): boolean {
    return this.configService.get<boolean>('cache.enabled', true);
  }

  private getDefaultLockTtlMs(): number {
    return this.configService.get<number>('cache.lockTtlMs', DEFAULT_CACHE_LOCK_TTL_MS);
  }

  private getDefaultWaitTimeoutMs(): number {
    return this.configService.get<number>('cache.waitTimeoutMs', DEFAULT_CACHE_WAIT_TIMEOUT_MS);
  }

  private getDefaultNullCacheTtlSeconds(): number {
    return this.configService.get<number>(
      'cache.nullTtlSeconds',
      DEFAULT_NULL_CACHE_TTL_SECONDS,
    );
  }

  private applyTtlJitter(ttlSeconds: number): number {
    const jitterSeconds = this.configService.get<number>(
      'cache.ttlJitterSeconds',
      DEFAULT_CACHE_TTL_JITTER_SECONDS,
    );

    if (jitterSeconds <= 0) {
      return ttlSeconds;
    }

    return ttlSeconds + Math.floor(Math.random() * (jitterSeconds + 1));
  }
}
