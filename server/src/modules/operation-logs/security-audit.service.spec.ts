import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { OperationLogsService } from './operation-logs.service';
import { SecurityAuditService } from './security-audit.service';

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;
  let operationLogsService: { record: jest.Mock };
  let notificationsService: { sendNotification: jest.Mock };

  beforeEach(() => {
    operationLogsService = {
      record: jest.fn().mockResolvedValue({ id: 1 }),
    };
    notificationsService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };

    service = new SecurityAuditService(
      operationLogsService as unknown as OperationLogsService,
      {
        get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
          const values: Record<string, unknown> = {
            'security.alertRecipients': ['secops@example.com'],
            'security.alertCooldownSeconds': 300,
            'email.host': 'smtp.example.com',
          };

          return key in values ? values[key] : fallback;
        }),
      } as unknown as ConfigService,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('应对敏感字段脱敏并发送告警邮件', async () => {
    await service.record({
      moduleName: 'auth',
      actionName: 'login_failed',
      eventType: 'auth.login_failed',
      severity: 'warning',
      alert: true,
      summary: '账号登录失败',
      requestPath: '/api/auth/login',
      requestMethod: 'POST',
      responseCode: 401,
      payload: {
        account: 'security@example.com',
        password: 'super-secret-password',
        nested: {
          token: 'jwt-token',
        },
      },
    });

    expect(operationLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        requestPayload: {
          audit: {
            eventType: 'auth.login_failed',
            severity: 'warning',
            alert: true,
            summary: '账号登录失败',
          },
          context: {
            account: 'se******@example.com',
            password: '[REDACTED]',
            nested: {
              token: '[REDACTED]',
            },
          },
        },
      }),
    );
    expect(notificationsService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'secops@example.com',
        subject: '[安全告警][WARNING] auth.login_failed',
      }),
    );
  });

  it('同一冷却窗口内应抑制重复告警邮件', async () => {
    const input = {
      moduleName: 'backup',
      actionName: 'restore_failed',
      eventType: 'backup.restore_failed',
      severity: 'critical' as const,
      alert: true,
      summary: '数据库恢复失败',
      requestPath: '/api/admin/backup/demo.sql/restore',
      requestMethod: 'POST',
      responseCode: 500,
      targetId: 'demo.sql',
      payload: {
        filename: 'demo.sql',
      },
    };

    await service.record(input);
    await service.record(input);

    expect(operationLogsService.record).toHaveBeenCalledTimes(2);
    expect(notificationsService.sendNotification).toHaveBeenCalledTimes(1);
  });
});
