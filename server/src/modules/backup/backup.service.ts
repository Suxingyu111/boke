import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sanitizeAttachmentFileName } from '@common/security/file-validation.util';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { SecurityAuditService } from '../operation-logs/security-audit.service';

export interface BackupFileDescriptor {
  filename: string;
  size: number;
  createdAt: string;
}

export interface BackupDrillReport {
  id: string;
  filename: string;
  targetDatabase: string;
  backupCreatedAt: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  rtoSeconds: number;
  rpoSeconds: number;
  rtoTargetSeconds: number;
  rpoTargetSeconds: number;
  validatedTableCount: number;
  cleanupPerformed: boolean;
  success: boolean;
  failureReason: string | null;
}

export interface BackupDrillSummary {
  total: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  rtoTargetSeconds: number;
  rpoTargetSeconds: number;
  lastDrillAt: string | null;
  lastSuccessfulDrillAt: string | null;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly drillReportPath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly securityAuditService: SecurityAuditService,
  ) {
    this.backupDir = path.resolve(process.cwd(), 'backups');
    this.drillReportPath = path.join(this.backupDir, 'drill-reports.json');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /** 执行数据库备份 */
  async createBackup(): Promise<BackupFileDescriptor> {
    const connection = this.getDatabaseConnectionConfig();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${connection.database}_${timestamp}.sql`;
    const filePath = path.join(this.backupDir, filename);

    const dumpArgs = this.buildMysqlDumpArgs(connection);

    try {
      await this.runDatabaseCommand('mysqldump', dumpArgs, {
        password: connection.password,
        stdoutFilePath: filePath,
      });
      const stats = fs.statSync(filePath);
      this.logger.log(`数据库备份完成：${filename}，大小：${stats.size} bytes`);
      return {
        filename,
        size: stats.size,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      this.safeRemoveFile(filePath);
      await this.securityAuditService.recordBestEffort({
        moduleName: 'backup',
        actionName: 'create_failed',
        eventType: 'backup.create_failed',
        severity: 'critical',
        alert: true,
        summary: '数据库备份失败',
        targetType: 'backup',
        targetId: filename,
        requestPath: '/api/admin/backup',
        requestMethod: 'POST',
        responseCode: 500,
        payload: {
          filename,
          database: connection.database,
          reason: error instanceof Error ? error.message : String(error),
        },
      });
      this.logger.error(
        '数据库备份失败',
        this.sanitizeSensitiveText(error instanceof Error ? error.stack ?? error.message : String(error), connection.password),
      );
      throw new Error('数据库备份失败，请检查 mysqldump 是否可用');
    }
  }

  /** 获取所有备份文件列表 */
  async listBackups(): Promise<BackupFileDescriptor[]> {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    const files = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.sql'));
    return files
      .map(filename => {
        const filePath = path.join(this.backupDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** 恢复指定备份 */
  async restoreBackup(filename: string): Promise<{ message: string }> {
    const sanitizedFilename = sanitizeAttachmentFileName(filename, ['.sql']);
    const filePath = path.join(this.backupDir, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      await this.securityAuditService.recordBestEffort({
        moduleName: 'backup',
        actionName: 'restore_failed',
        eventType: 'backup.restore_failed',
        severity: 'warning',
        alert: true,
        summary: '数据库恢复失败：备份文件不存在',
        targetType: 'backup',
        targetId: sanitizedFilename,
        requestPath: `/api/admin/backup/${sanitizedFilename}/restore`,
        requestMethod: 'POST',
        responseCode: 404,
        payload: {
          filename: sanitizedFilename,
          reason: 'backup_not_found',
        },
      });
      throw new Error(`备份文件不存在：${sanitizedFilename}`);
    }

    const connection = this.getDatabaseConnectionConfig();
    const restoreArgs = this.buildMysqlRestoreArgs(connection);

    try {
      await this.runDatabaseCommand('mysql', restoreArgs, {
        password: connection.password,
        stdinFilePath: filePath,
      });
      this.logger.log(`数据库恢复完成：${sanitizedFilename}`);
      return { message: `数据库已从备份 ${sanitizedFilename} 恢复` };
    } catch (error) {
      await this.securityAuditService.recordBestEffort({
        moduleName: 'backup',
        actionName: 'restore_failed',
        eventType: 'backup.restore_failed',
        severity: 'critical',
        alert: true,
        summary: '数据库恢复失败',
        targetType: 'backup',
        targetId: sanitizedFilename,
        requestPath: `/api/admin/backup/${sanitizedFilename}/restore`,
        requestMethod: 'POST',
        responseCode: 500,
        payload: {
          filename: sanitizedFilename,
          database: connection.database,
          reason: error instanceof Error ? error.message : String(error),
        },
      });
      this.logger.error(
        '数据库恢复失败',
        this.sanitizeSensitiveText(error instanceof Error ? error.stack ?? error.message : String(error), connection.password),
      );
      throw new Error('数据库恢复失败，请检查备份文件是否有效');
    }
  }

  /** 下载备份文件 */
  downloadBackup(filename: string): StreamableFile {
    const sanitizedFilename = sanitizeAttachmentFileName(filename, ['.sql']);
    const filePath = path.join(this.backupDir, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      void this.securityAuditService.recordBestEffort({
        moduleName: 'backup',
        actionName: 'download_failed',
        eventType: 'backup.download_failed',
        severity: 'warning',
        alert: true,
        summary: '备份下载失败：备份文件不存在',
        targetType: 'backup',
        targetId: sanitizedFilename,
        requestPath: `/api/admin/backup/${sanitizedFilename}/download`,
        requestMethod: 'GET',
        responseCode: 404,
        payload: {
          filename: sanitizedFilename,
          reason: 'backup_not_found',
        },
      });
      throw new Error(`备份文件不存在：${sanitizedFilename}`);
    }

    const stream = fs.createReadStream(filePath);
    return new StreamableFile(stream, {
      type: 'application/sql',
      disposition: `attachment; filename="${sanitizedFilename}"`,
    });
  }

  /** 删除备份文件 */
  async deleteBackup(filename: string): Promise<{ message: string }> {
    const sanitizedFilename = sanitizeAttachmentFileName(filename, ['.sql']);
    const filePath = path.join(this.backupDir, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      await this.securityAuditService.recordBestEffort({
        moduleName: 'backup',
        actionName: 'delete_failed',
        eventType: 'backup.delete_failed',
        severity: 'warning',
        alert: true,
        summary: '备份删除失败：备份文件不存在',
        targetType: 'backup',
        targetId: sanitizedFilename,
        requestPath: `/api/admin/backup/${sanitizedFilename}`,
        requestMethod: 'DELETE',
        responseCode: 404,
        payload: {
          filename: sanitizedFilename,
          reason: 'backup_not_found',
        },
      });
      throw new Error(`备份文件不存在：${sanitizedFilename}`);
    }

    fs.unlinkSync(filePath);
    this.logger.log(`备份文件已删除：${sanitizedFilename}`);
    return { message: `备份文件 ${sanitizedFilename} 已删除` };
  }

  async listRecoveryDrills(): Promise<{
    items: BackupDrillReport[];
    summary: BackupDrillSummary;
  }> {
    const items = this.readDrillReports().sort((left, right) =>
      right.startedAt.localeCompare(left.startedAt),
    );

    return {
      items,
      summary: this.buildDrillSummary(items),
    };
  }

  async runRecoveryDrill(filename: string): Promise<BackupDrillReport> {
    const sanitizedFilename = sanitizeAttachmentFileName(filename, ['.sql']);
    const filePath = path.join(this.backupDir, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      await this.securityAuditService.recordBestEffort({
        moduleName: 'backup',
        actionName: 'drill_failed',
        eventType: 'backup.drill_failed',
        severity: 'warning',
        alert: true,
        summary: '恢复演练失败：备份文件不存在',
        targetType: 'backup-drill',
        targetId: sanitizedFilename,
        requestPath: `/api/admin/backup/${sanitizedFilename}/drill`,
        requestMethod: 'POST',
        responseCode: 404,
        payload: {
          filename: sanitizedFilename,
          reason: 'backup_not_found',
        },
      });
      throw new Error(`备份文件不存在：${sanitizedFilename}`);
    }

    const connection = this.getDatabaseConnectionConfig();
    const targetDatabase = this.getBackupDrillDatabase(connection.database);
    this.assertSafeDatabaseName(targetDatabase);

    const stats = fs.statSync(filePath);
    const startedAt = new Date();
    let validatedTableCount = 0;
    let cleanupPerformed = false;
    let failureReason: string | null = null;

    try {
      await this.ensureDrillDatabaseState(connection, targetDatabase);
      await this.runDatabaseCommand(
        'mysql',
        this.buildMysqlRestoreArgs({ ...connection, database: targetDatabase }),
        {
          password: connection.password,
          stdinFilePath: filePath,
        },
      );
      validatedTableCount = await this.validateRestoredBackup(connection, targetDatabase);
    } catch (error) {
      failureReason = error instanceof Error ? error.message : String(error);
    }

    if (this.shouldCleanupDrillDatabase()) {
      try {
        await this.dropDrillDatabase(connection, targetDatabase);
        cleanupPerformed = true;
      } catch (cleanupError) {
        const cleanupMessage =
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        failureReason = failureReason
          ? `${failureReason}; 清理失败：${cleanupMessage}`
          : `演练清理失败：${cleanupMessage}`;
      }
    }

    const finishedAt = new Date();
    const report = this.buildDrillReport({
      filename: sanitizedFilename,
      targetDatabase,
      backupCreatedAt: stats.mtime,
      startedAt,
      finishedAt,
      validatedTableCount,
      cleanupPerformed,
      failureReason,
    });
    this.persistDrillReport(report);

    await this.securityAuditService.recordBestEffort({
      moduleName: 'backup',
      actionName: report.success ? 'drill_succeeded' : 'drill_failed',
      eventType: report.success ? 'backup.drill_succeeded' : 'backup.drill_failed',
      severity: report.success ? 'info' : 'critical',
      alert: !report.success,
      summary: report.success ? '恢复演练成功' : '恢复演练失败',
      targetType: 'backup-drill',
      targetId: report.id,
      requestPath: `/api/admin/backup/${sanitizedFilename}/drill`,
      requestMethod: 'POST',
      responseCode: report.success ? 201 : 500,
      payload: {
        filename: sanitizedFilename,
        targetDatabase,
        rtoSeconds: report.rtoSeconds,
        rpoSeconds: report.rpoSeconds,
        validatedTableCount,
        cleanupPerformed,
        failureReason: report.failureReason,
      },
    });

    if (!report.success) {
      throw new Error(`恢复演练失败：${report.failureReason ?? '未知错误'}`);
    }

    return report;
  }

  private getDatabaseConnectionConfig(): {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  } {
    return {
      host: this.configService.get<string>('database.host', 'localhost'),
      port: this.configService.get<number>('database.port', 3306),
      username: this.configService.get<string>('database.username', 'root'),
      password: this.configService.get<string>('database.password', ''),
      database: this.configService.get<string>('database.database', 'blog_system'),
    };
  }

  private buildMysqlDumpArgs(connection: {
    host: string;
    port: number;
    username: string;
    database: string;
  }): string[] {
    return [
      `--host=${connection.host}`,
      `--port=${connection.port}`,
      `--user=${connection.username}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--add-drop-table',
      connection.database,
    ];
  }

  private buildMysqlRestoreArgs(connection: {
    host: string;
    port: number;
    username: string;
    database: string;
  }): string[] {
    return [
      `--host=${connection.host}`,
      `--port=${connection.port}`,
      `--user=${connection.username}`,
      connection.database,
    ];
  }

  private buildMysqlQueryArgs(connection: {
    host: string;
    port: number;
    username: string;
    database?: string;
  }, statement: string): string[] {
    return [
      `--host=${connection.host}`,
      `--port=${connection.port}`,
      `--user=${connection.username}`,
      '--batch',
      '--skip-column-names',
      ...(connection.database ? [connection.database] : []),
      '-e',
      statement,
    ];
  }

  private runDatabaseCommand(
    executable: string,
    args: string[],
    options: {
      password: string;
      stdinFilePath?: string;
      stdoutFilePath?: string;
      captureStdout?: boolean;
    },
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        env: this.buildMysqlCommandEnv(options.password),
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      let stdout = '';
      let stdoutFinished: Promise<void> = Promise.resolve();

      if (options.stdoutFilePath) {
        const output = fs.createWriteStream(options.stdoutFilePath);
        stdoutFinished = new Promise<void>((streamResolve, streamReject) => {
          output.on('finish', streamResolve);
          output.on('error', streamReject);
        });
        child.stdout.pipe(output);
      } else if (options.captureStdout) {
        child.stdout.on('data', chunk => {
          stdout += chunk.toString();
        });
      } else {
        child.stdout.resume();
      }

      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });

      child.on('error', error => {
        reject(
          new Error(
            this.sanitizeSensitiveText(
              `${executable} 执行失败：${error.message}`,
              options.password,
            ),
          ),
        );
      });

      child.on('close', code => {
        if (code !== 0) {
          reject(
            new Error(
              this.sanitizeSensitiveText(
                stderr.trim() || `${executable} 执行失败，退出码 ${code ?? 'unknown'}`,
                options.password,
              ),
            ),
          );
          return;
        }

        stdoutFinished.then(() => resolve(stdout.trim()), reject);
      });

      if (options.stdinFilePath) {
        const input = fs.createReadStream(options.stdinFilePath);
        input.on('error', reject);
        input.pipe(child.stdin);
        return;
      }

      child.stdin.end();
    });
  }

  private buildMysqlCommandEnv(password: string): NodeJS.ProcessEnv {
    if (!password) {
      return { ...process.env };
    }

    return {
      ...process.env,
      MYSQL_PWD: password,
    };
  }

  private sanitizeSensitiveText(message: string, password: string): string {
    let sanitized = message;

    if (password) {
      sanitized = sanitized.split(password).join('[REDACTED]');
    }

    return sanitized.replace(/(MYSQL_PWD=)([^\s]+)/g, '$1[REDACTED]');
  }

  private safeRemoveFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private async ensureDrillDatabaseState(
    connection: {
      host: string;
      port: number;
      username: string;
      password: string;
    },
    databaseName: string,
  ): Promise<void> {
    await this.runDatabaseCommand(
      'mysql',
      this.buildMysqlQueryArgs(connection, [
        `DROP DATABASE IF EXISTS \`${databaseName}\``,
        `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      ].join('; ')),
      {
        password: connection.password,
      },
    );
  }

  private async dropDrillDatabase(
    connection: {
      host: string;
      port: number;
      username: string;
      password: string;
    },
    databaseName: string,
  ): Promise<void> {
    await this.runDatabaseCommand(
      'mysql',
      this.buildMysqlQueryArgs(connection, `DROP DATABASE IF EXISTS \`${databaseName}\``),
      {
        password: connection.password,
      },
    );
  }

  private async validateRestoredBackup(
    connection: {
      host: string;
      port: number;
      username: string;
      password: string;
    },
    databaseName: string,
  ): Promise<number> {
    const result = await this.runDatabaseCommand(
      'mysql',
      this.buildMysqlQueryArgs(
        connection,
        `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${databaseName}'`,
      ),
      {
        password: connection.password,
        captureStdout: true,
      },
    );
    const parsedCount = Number.parseInt(result.split(/\r?\n/).pop()?.trim() ?? '', 10);

    if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
      throw new Error('恢复演练校验失败：目标库中未发现数据表');
    }

    return parsedCount;
  }

  private buildDrillReport(input: {
    filename: string;
    targetDatabase: string;
    backupCreatedAt: Date;
    startedAt: Date;
    finishedAt: Date;
    validatedTableCount: number;
    cleanupPerformed: boolean;
    failureReason: string | null;
  }): BackupDrillReport {
    const durationMs = Math.max(input.finishedAt.getTime() - input.startedAt.getTime(), 0);
    const rtoSeconds = Math.ceil(durationMs / 1000);
    const rpoSeconds = Math.max(
      Math.ceil((input.startedAt.getTime() - input.backupCreatedAt.getTime()) / 1000),
      0,
    );
    const rtoTargetSeconds = this.getBackupDrillRtoSeconds();
    const rpoTargetSeconds = this.getBackupDrillRpoSeconds();
    const withinTargets = rtoSeconds <= rtoTargetSeconds && rpoSeconds <= rpoTargetSeconds;

    return {
      id: randomUUID(),
      filename: input.filename,
      targetDatabase: input.targetDatabase,
      backupCreatedAt: input.backupCreatedAt.toISOString(),
      startedAt: input.startedAt.toISOString(),
      finishedAt: input.finishedAt.toISOString(),
      durationMs,
      rtoSeconds,
      rpoSeconds,
      rtoTargetSeconds,
      rpoTargetSeconds,
      validatedTableCount: input.validatedTableCount,
      cleanupPerformed: input.cleanupPerformed,
      success: withinTargets && !input.failureReason,
      failureReason:
        input.failureReason ??
        (withinTargets
          ? null
          : `RTO/RPO 未达标（RTO=${rtoSeconds}s/${rtoTargetSeconds}s，RPO=${rpoSeconds}s/${rpoTargetSeconds}s）`),
    };
  }

  private persistDrillReport(report: BackupDrillReport): void {
    const reports = this.readDrillReports();
    reports.unshift(report);
    fs.writeFileSync(this.drillReportPath, JSON.stringify(reports.slice(0, 100), null, 2), 'utf8');
  }

  private readDrillReports(): BackupDrillReport[] {
    if (!fs.existsSync(this.drillReportPath)) {
      return [];
    }

    try {
      const raw = fs.readFileSync(this.drillReportPath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as BackupDrillReport[]) : [];
    } catch (error) {
      this.logger.warn(
        `读取恢复演练历史失败，已忽略损坏数据：${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private buildDrillSummary(items: BackupDrillReport[]): BackupDrillSummary {
    const successCount = items.filter(item => item.success).length;
    const failureCount = items.length - successCount;

    return {
      total: items.length,
      successCount,
      failureCount,
      successRate: items.length === 0 ? 1 : Number((successCount / items.length).toFixed(4)),
      rtoTargetSeconds: this.getBackupDrillRtoSeconds(),
      rpoTargetSeconds: this.getBackupDrillRpoSeconds(),
      lastDrillAt: items[0]?.startedAt ?? null,
      lastSuccessfulDrillAt: items.find(item => item.success)?.startedAt ?? null,
    };
  }

  private assertSafeDatabaseName(databaseName: string): void {
    if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
      throw new Error('恢复演练目标库名不合法，仅允许字母、数字和下划线');
    }
  }

  private getBackupDrillDatabase(baseDatabase: string): string {
    return this.configService.get<string>('backup.drillDatabase', `${baseDatabase}_drill`);
  }

  private shouldCleanupDrillDatabase(): boolean {
    return this.configService.get<boolean>('backup.drillCleanup', true);
  }

  private getBackupDrillRtoSeconds(): number {
    return this.configService.get<number>('backup.drillRtoSeconds', 900);
  }

  private getBackupDrillRpoSeconds(): number {
    return this.configService.get<number>('backup.drillRpoSeconds', 86400);
  }
}
