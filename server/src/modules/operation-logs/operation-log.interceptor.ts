import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap, map } from 'rxjs/operators';
import { User } from '@database/entities';
import { SecurityAuditService } from './security-audit.service';
import { sanitizeAuditPayload } from './security-audit.util';

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
  constructor(private readonly securityAuditService: SecurityAuditService) {}

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

    await this.securityAuditService.record({
      operatorId: request.user?.id ?? null,
      moduleName,
      actionName,
      eventType: `admin.${moduleName}.${actionName}`,
      severity: this.deriveSeverity(moduleName, actionName, responseCode),
      alert: this.shouldAlert(moduleName, actionName, responseCode),
      summary: `${request.method.toUpperCase()} ${requestPath}`,
      targetType: this.deriveTargetType(moduleName),
      targetId: this.deriveTargetId(request.params),
      requestMethod: request.method,
      requestPath,
      payload,
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

    return sanitizeAuditPayload(combined);
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

  private deriveSeverity(
    moduleName: string,
    actionName: string,
    responseCode: number,
  ): 'info' | 'warning' | 'critical' {
    if (responseCode >= 500) {
      return 'critical';
    }

    if (responseCode >= 400 || this.isHighRiskOperation(moduleName, actionName)) {
      return 'warning';
    }

    return 'info';
  }

  private shouldAlert(moduleName: string, actionName: string, responseCode: number): boolean {
    return responseCode >= 500 || this.isHighRiskOperation(moduleName, actionName);
  }

  private isHighRiskOperation(moduleName: string, actionName: string): boolean {
    const highRiskActions = new Set(['export', 'restore', 'delete']);

    if (moduleName === 'backup' || moduleName === 'database-admin') {
      return highRiskActions.has(actionName) || actionName === 'create';
    }

    return false;
  }
}
