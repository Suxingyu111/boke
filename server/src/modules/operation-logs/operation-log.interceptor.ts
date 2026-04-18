import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap, map } from 'rxjs/operators';
import { User } from '@database/entities';
import { OperationLogsService } from './operation-logs.service';

type RequestWithUser = {
  method: string;
  originalUrl?: string;
  url: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
  user?: User;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(private readonly operationLogsService: OperationLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();

    if (!this.shouldLog(request)) {
      return next.handle();
    }

    return next.handle().pipe(
      mergeMap(data =>
        from(this.persistLog(request, response.statusCode ?? 200)).pipe(map(() => data)),
      ),
      catchError(error =>
        from(this.persistLog(request, error?.status ?? 500)).pipe(
          mergeMap(() => throwError(() => error)),
        ),
      ),
    );
  }

  private shouldLog(request: RequestWithUser): boolean {
    const requestPath = request.originalUrl ?? request.url;
    if (!requestPath.startsWith('/api/admin/')) {
      return false;
    }

    if (requestPath.startsWith('/api/admin/operation-logs')) {
      return false;
    }

    return this.isMutationMethod(request.method) || requestPath.includes('/export');
  }

  private async persistLog(request: RequestWithUser, responseCode: number) {
    const requestPath = request.originalUrl ?? request.url;
    const moduleName = this.deriveModuleName(requestPath);
    const actionName = this.deriveActionName(request.method, requestPath);
    const payload = this.buildPayload(request);

    await this.operationLogsService.record({
      operatorId: request.user?.id ?? null,
      moduleName,
      actionName,
      targetType: this.deriveTargetType(moduleName),
      targetId: this.deriveTargetId(request.params),
      requestMethod: request.method,
      requestPath,
      requestPayload: payload,
      responseCode,
      ipAddress: request.ip ?? null,
      userAgent: this.normalizeUserAgent(request.headers['user-agent']),
    });
  }

  private buildPayload(request: RequestWithUser): Record<string, unknown> | null {
    const combined = {
      ...(request.body ?? {}),
      ...(request.query ?? {}),
    };

    if (Object.keys(combined).length === 0) {
      return null;
    }

    return this.sanitizePayload(combined);
  }

  private sanitizePayload(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const payload: Record<string, unknown> = {};
    for (const [key, currentValue] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      if (['password', 'token', 'buffer', 'file'].includes(normalizedKey)) {
        payload[key] = '[REDACTED]';
        continue;
      }

      if (Array.isArray(currentValue)) {
        payload[key] = currentValue.map(item =>
          typeof item === 'object' && item !== null ? this.sanitizePayload(item) : item,
        );
        continue;
      }

      if (typeof currentValue === 'object' && currentValue !== null) {
        payload[key] = this.sanitizePayload(currentValue);
        continue;
      }

      payload[key] = currentValue;
    }

    return payload;
  }

  private deriveModuleName(requestPath: string): string {
    const segments = requestPath.split('?')[0].split('/').filter(Boolean);
    return segments[2] ?? 'admin';
  }

  private deriveActionName(method: string, requestPath: string): string {
    if (requestPath.includes('/export')) {
      return 'export';
    }

    if (requestPath.includes('/upload')) {
      return 'upload';
    }

    if (requestPath.includes('/restore')) {
      return 'restore';
    }

    switch (method.toUpperCase()) {
      case 'POST':
        return 'create';
      case 'PATCH':
      case 'PUT':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return method.toLowerCase();
    }
  }

  private deriveTargetType(moduleName: string): string {
    return moduleName.endsWith('s') ? moduleName.slice(0, -1) : moduleName;
  }

  private deriveTargetId(params?: Record<string, string | undefined>): string | null {
    if (!params) {
      return null;
    }

    return params.id ?? params.articleId ?? params.seriesId ?? params.versionId ?? null;
  }

  private normalizeUserAgent(userAgent: string | string[] | undefined): string | null {
    if (!userAgent) {
      return null;
    }

    return Array.isArray(userAgent) ? userAgent.join('; ') : userAgent;
  }

  private isMutationMethod(method: string): boolean {
    return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase());
  }
}