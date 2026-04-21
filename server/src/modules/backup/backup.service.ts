import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sanitizeAttachmentFileName } from '@common/security/file-validation.util';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;

  constructor(private readonly configService: ConfigService) {
    this.backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /** 执行数据库备份 */
  async createBackup(): Promise<{ filename: string; size: number; createdAt: string }> {
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
      this.logger.error(
        '数据库备份失败',
        this.sanitizeSensitiveText(error instanceof Error ? error.stack ?? error.message : String(error), connection.password),
      );
      throw new Error('数据库备份失败，请检查 mysqldump 是否可用');
    }
  }

  /** 获取所有备份文件列表 */
  async listBackups(): Promise<Array<{ filename: string; size: number; createdAt: string }>> {
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
      throw new Error(`备份文件不存在：${sanitizedFilename}`);
    }

    fs.unlinkSync(filePath);
    this.logger.log(`备份文件已删除：${sanitizedFilename}`);
    return { message: `备份文件 ${sanitizedFilename} 已删除` };
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

  private runDatabaseCommand(
    executable: string,
    args: string[],
    options: {
      password: string;
      stdinFilePath?: string;
      stdoutFilePath?: string;
    },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        env: this.buildMysqlCommandEnv(options.password),
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      let stdoutFinished: Promise<void> = Promise.resolve();

      if (options.stdoutFilePath) {
        const output = fs.createWriteStream(options.stdoutFilePath);
        stdoutFinished = new Promise<void>((streamResolve, streamReject) => {
          output.on('finish', streamResolve);
          output.on('error', streamReject);
        });
        child.stdout.pipe(output);
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

        stdoutFinished.then(() => resolve(), reject);
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
}
