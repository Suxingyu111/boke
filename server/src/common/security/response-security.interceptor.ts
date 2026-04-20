import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { NO_STORE_RESPONSE_METADATA } from './security.constants';

type RequestWithUser = Request & {
  user?: unknown;
};

@Injectable()
export class ResponseSecurityInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const response = context.switchToHttp().getResponse<Response>();

      if (this.shouldDisableCaching(context, request)) {
        response.setHeader('Cache-Control', 'no-store, private, max-age=0');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
        this.appendVaryHeader(response, 'Authorization');
      } else if (!response.getHeader('Cache-Control')) {
        response.setHeader('Cache-Control', 'no-cache');
      }

      this.appendVaryHeader(response, 'Origin');
    }

    return next.handle();
  }

  private shouldDisableCaching(context: ExecutionContext, request: RequestWithUser): boolean {
    const noStore = this.reflector.getAllAndOverride<boolean | undefined>(
      NO_STORE_RESPONSE_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (noStore) {
      return true;
    }

    const requestPath = request.originalUrl || request.url;
    return (
      request.method !== 'GET' ||
      Boolean(request.user) ||
      typeof request.headers.authorization === 'string' ||
      requestPath.startsWith('/api/admin') ||
      requestPath.startsWith('/api/auth')
    );
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
