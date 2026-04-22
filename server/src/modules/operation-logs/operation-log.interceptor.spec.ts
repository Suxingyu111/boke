import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { OperationLogInterceptor } from './operation-log.interceptor';
import { SecurityAuditService } from './security-audit.service';

describe('OperationLogInterceptor', () => {
  let interceptor: OperationLogInterceptor;
  let securityAuditService: { record: jest.Mock };

  beforeEach(() => {
    securityAuditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    interceptor = new OperationLogInterceptor(
      securityAuditService as unknown as SecurityAuditService,
    );
  });

  it('应记录高危后台操作并脱敏请求体', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/admin/backup',
          url: '/api/admin/backup',
          body: {
            password: 'top-secret',
            contact: 'security@example.com',
            nested: {
              token: 'jwt-token',
            },
          },
          query: {},
          params: {},
          user: { id: 'admin-1' },
          ip: '203.0.113.8',
          headers: {
            'user-agent': 'jest-agent',
          },
        }),
        getResponse: () => ({
          statusCode: 201,
        }),
      }),
    } as unknown as ExecutionContext;

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ ok: true }),
      } as CallHandler),
    );

    expect(securityAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleName: 'backup',
        actionName: 'create',
        eventType: 'admin.backup.create',
        severity: 'warning',
        alert: true,
        payload: {
          password: '[REDACTED]',
          contact: 'se******@example.com',
          nested: {
            token: '[REDACTED]',
          },
        },
      }),
    );
  });

  it('非后台请求不应记录审计日志', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/api/articles/hello-world',
          url: '/api/articles/hello-world',
          headers: {},
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as unknown as ExecutionContext;

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ ok: true }),
      } as CallHandler),
    );

    expect(securityAuditService.record).not.toHaveBeenCalled();
  });
});
