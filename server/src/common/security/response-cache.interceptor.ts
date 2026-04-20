import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { from, lastValueFrom, Observable } from 'rxjs';
import { ResponseCacheOptions } from './decorators/response-cache.decorator';
import { NO_STORE_RESPONSE_METADATA, RESPONSE_CACHE_METADATA } from './security.constants';
import { ResponseCacheService } from './response-cache.service';

type RequestWithUser = Request & {
  user?: unknown;
};

@Injectable()
export class ResponseCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly responseCacheService: ResponseCacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const cacheOptions = this.reflector.getAllAndOverride<ResponseCacheOptions | undefined>(
      RESPONSE_CACHE_METADATA,
      [context.getHandler(), context.getClass()],
    );
    const noStore = this.reflector.getAllAndOverride<boolean | undefined>(
      NO_STORE_RESPONSE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!cacheOptions || noStore || this.shouldBypassCache(request)) {
      return next.handle();
    }

    return from(this.handleCachedRequest(request, response, next, cacheOptions));
  }

  private async handleCachedRequest(
    request: Request,
    response: Response,
    next: CallHandler,
    options: ResponseCacheOptions,
  ): Promise<unknown> {
    const cacheKey = this.responseCacheService.createCacheKey(
      options.keyPrefix,
      this.buildCacheIdentifier(request),
    );
    const cacheResult = await this.responseCacheService.getOrSet(
      cacheKey,
      () => lastValueFrom(next.handle()),
      {
        ttlSeconds: options.ttlSeconds,
        nullTtlSeconds: options.nullTtlSeconds,
        cacheNotFound: options.cacheNotFound,
      },
    );

    const clientTtlSeconds = options.clientTtlSeconds ?? Math.min(options.ttlSeconds, 60);
    this.applyCacheHeaders(response, cacheResult.source, clientTtlSeconds);
    return cacheResult.value;
  }

  private shouldBypassCache(request: RequestWithUser): boolean {
    return (
      request.method !== 'GET' ||
      Boolean(request.user) ||
      typeof request.headers.authorization === 'string'
    );
  }

  private buildCacheIdentifier(request: Request): string {
    const acceptLanguage = request.get('accept-language')?.toLowerCase() ?? '';
    return `${request.method}:${request.originalUrl}:${acceptLanguage}`;
  }

  private applyCacheHeaders(
    response: Response,
    source: 'hit' | 'miss' | 'bypass',
    clientTtlSeconds: number,
  ): void {
    response.setHeader('X-Cache', source.toUpperCase());
    response.setHeader(
      'Cache-Control',
      `public, max-age=${clientTtlSeconds}, stale-while-revalidate=${Math.min(clientTtlSeconds, 30)}`,
    );
    this.appendVaryHeader(response, 'Origin');
  }

  private appendVaryHeader(response: Response, value: string): void {
    const existingValue = response.getHeader('Vary');
    const items = new Set(
      String(existingValue ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
    );
    items.add(value);
    response.setHeader('Vary', [...items].join(', '));
  }
}
