import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OperationLog } from '@database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { OperationLogsService } from './operation-logs.service';
import { sanitizeAuditPayload } from './security-audit.util';

export type SecurityAuditSeverity = 'info' | 'warning' | 'critical';

export interface SecurityAuditInput {
  operatorId?: string | null;
  moduleName: string;
  actionName: string;
  eventType?: string;
  severity?: SecurityAuditSeverity;
  alert?: boolean;
  summary?: string;
  targetType?: string | null;
  targetId?: string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
  payload?: Record<string, unknown> | null;
  responseCode?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);
  private readonly alertCooldownCache = new Map<string, number>();

  constructor(
    private readonly operationLogsService: OperationLogsService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async record(input: SecurityAuditInput): Promise<OperationLog> {
    const eventType = input.eventType ?? `${input.moduleName}.${input.actionName}`;
    const severity = input.severity ?? 'info';
    const sanitizedPayload = sanitizeAuditPayload(input.payload);

    const saved = await this.operationLogsService.record({
      operatorId: input.operatorId ?? null,
      moduleName: input.moduleName,
      actionName: input.actionName,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      requestMethod: input.requestMethod ?? null,
      requestPath: input.requestPath ?? null,
      requestPayload: this.buildStoredPayload(
        eventType,
        severity,
        Boolean(input.alert),
        input.summary,
        sanitizedPayload,
      ),
      responseCode: input.responseCode ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    this.writeStructuredLog({
      eventType,
      severity,
      alert: Boolean(input.alert),
      summary: input.summary ?? null,
      moduleName: input.moduleName,
      actionName: input.actionName,
      operatorId: input.operatorId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      requestMethod: input.requestMethod ?? null,
      requestPath: input.requestPath ?? null,
      responseCode: input.responseCode ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      payload: sanitizedPayload,
    });

    if (input.alert) {
      await this.sendAlertIfNeeded({
        eventType,
        severity,
        summary: input.summary ?? `${input.moduleName}.${input.actionName}`,
        operatorId: input.operatorId ?? null,
        requestPath: input.requestPath ?? null,
        responseCode: input.responseCode ?? null,
        payload: sanitizedPayload,
        targetId: input.targetId ?? null,
      });
    }

    return saved;
  }

  async recordBestEffort(input: SecurityAuditInput): Promise<void> {
    try {
      await this.record(input);
    } catch (error) {
      this.logger.error(
        `安全审计写入失败: ${input.eventType ?? `${input.moduleName}.${input.actionName}`}`,
        error instanceof Error ? error.stack ?? error.message : String(error),
      );
    }
  }

  private buildStoredPayload(
    eventType: string,
    severity: SecurityAuditSeverity,
    alert: boolean,
    summary: string | undefined,
    payload: Record<string, unknown> | null,
  ): Record<string, unknown> {
    return {
      audit: {
        eventType,
        severity,
        alert,
        summary: summary ?? null,
      },
      context: payload,
    };
  }

  private writeStructuredLog(entry: Record<string, unknown>): void {
    const message = JSON.stringify(entry);

    if (entry.severity === 'critical') {
      this.logger.error(message);
      return;
    }

    if (entry.severity === 'warning') {
      this.logger.warn(message);
      return;
    }

    this.logger.log(message);
  }

  private async sendAlertIfNeeded(input: {
    eventType: string;
    severity: SecurityAuditSeverity;
    summary: string;
    operatorId: string | null;
    requestPath: string | null;
    responseCode: number | null;
    payload: Record<string, unknown> | null;
    targetId: string | null;
  }): Promise<void> {
    const recipients = this.getAlertRecipients();
    if (recipients.length === 0 || !this.isEmailAlertConfigured()) {
      return;
    }

    const alertKey = `${input.eventType}:${input.targetId ?? input.operatorId ?? 'global'}:${input.responseCode ?? 'na'}`;
    if (!this.shouldSendAlert(alertKey)) {
      return;
    }

    const subject = `[安全告警][${input.severity.toUpperCase()}] ${input.eventType}`;
    const body = this.buildAlertEmailBody(input);

    await Promise.all(
      recipients.map(async recipient => {
        try {
          await this.notificationsService.sendNotification({
            toEmail: recipient,
            subject,
            body,
            type: 'system',
          });
        } catch (error) {
          this.logger.error(
            `安全告警发送失败: ${recipient}`,
            error instanceof Error ? error.stack ?? error.message : String(error),
          );
        }
      }),
    );
  }

  private buildAlertEmailBody(input: {
    eventType: string;
    severity: SecurityAuditSeverity;
    summary: string;
    operatorId: string | null;
    requestPath: string | null;
    responseCode: number | null;
    payload: Record<string, unknown> | null;
  }): string {
    return `
      <div style="font-family: sans-serif; max-width: 720px; margin: 0 auto; padding: 20px;">
        <h2>博客系统安全告警</h2>
        <p><strong>事件：</strong>${input.eventType}</p>
        <p><strong>级别：</strong>${input.severity}</p>
        <p><strong>摘要：</strong>${input.summary}</p>
        <p><strong>操作者：</strong>${input.operatorId ?? 'anonymous'}</p>
        <p><strong>路径：</strong>${input.requestPath ?? 'n/a'}</p>
        <p><strong>响应码：</strong>${input.responseCode ?? 'n/a'}</p>
        <pre style="background: #111827; color: #f9fafb; padding: 16px; border-radius: 8px; overflow: auto;">${JSON.stringify(
          input.payload ?? {},
          null,
          2,
        )}</pre>
      </div>
    `;
  }

  private getAlertRecipients(): string[] {
    const configured = this.configService.get<string[]>('security.alertRecipients', []);
    if (configured.length > 0) {
      return configured;
    }

    const superAdminEmail = this.configService.get<string>('superAdmin.email');
    return superAdminEmail ? [superAdminEmail] : [];
  }

  private isEmailAlertConfigured(): boolean {
    return Boolean(this.configService.get<string>('email.host', ''));
  }

  private shouldSendAlert(key: string): boolean {
    const cooldownMs = this.configService.get<number>('security.alertCooldownSeconds', 300) * 1000;
    const now = Date.now();
    const lastSentUntil = this.alertCooldownCache.get(key) ?? 0;

    if (lastSentUntil > now) {
      return false;
    }

    this.alertCooldownCache.set(key, now + cooldownMs);
    return true;
  }
}
