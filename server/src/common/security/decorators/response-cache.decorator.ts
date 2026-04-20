import { SetMetadata } from '@nestjs/common';
import { RESPONSE_CACHE_METADATA } from '../security.constants';

export interface ResponseCacheOptions {
  keyPrefix: string;
  ttlSeconds: number;
  nullTtlSeconds?: number;
  clientTtlSeconds?: number;
  cacheNotFound?: boolean;
}

export const ResponseCache = (options: ResponseCacheOptions): MethodDecorator =>
  SetMetadata(RESPONSE_CACHE_METADATA, options);
