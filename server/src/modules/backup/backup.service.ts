import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

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
    const host = this.configService.get<string>('database.host', 'localhost');
    const port = this.configService.get<number>('database.port', 3306);
    const username = this.configService.get<string>('database.username', 'root');
    const password = this.configService.get<string>('database.password', '');
    const database = this.configService.get<string>('database.database', 'blog_system');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${database}_${timestamp}.sql`;
    const filePath = path.join(this.backupDir, filename);

    const dumpCmd = [
      'mysqldump',
      `--host=${host}`,
      `--port=${port}`,
      `--user=${username}`,
      password ? `--password=${password}` : '',
      '--single-transaction',
      '--routines',
      '--triggers',
      '--add-drop-table',
      database,
      `--result-file=${filePath}`,
    ]
      .filter(Boolean)
      .join(' ');

    try {
      await execAsync(dumpCmd);
      const stats = fs.statSync(filePath);
      this.logger.log(`数据库备份完成：${filename}，大小：${stats.size} bytes`);
      return {
        filename,
        size: stats.size,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('数据库备份失败', error);
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
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(this.backupDir, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`备份文件不存在：${sanitizedFilename}`);
    }

    const host = this.configService.get<string>('database.host', 'localhost');
    const port = this.configService.get<number>('database.port', 3306);
    const username = this.configService.get<string>('database.username', 'root');
    const password = this.configService.get<string>('database.password', '');
    const database = this.configService.get<string>('database.database', 'blog_system');

    const restoreCmd = [
      'mysql',
      `--host=${host}`,
      `--port=${port}`,
      `--user=${username}`,
      password ? `--password=${password}` : '',
      database,
      `< "${filePath}"`,
    ]
      .filter(Boolean)
      .join(' ');

    try {
      await execAsync(restoreCmd);
      this.logger.log(`数据库恢复完成：${sanitizedFilename}`);
      return { message: `数据库已从备份 ${sanitizedFilename} 恢复` };
    } catch (error) {
      this.logger.error('数据库恢复失败', error);
      throw new Error('数据库恢复失败，请检查备份文件是否有效');
    }
  }

  /** 下载备份文件 */
  downloadBackup(filename: string): StreamableFile {
    const sanitizedFilename = path.basename(filename);
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
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(this.backupDir, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`备份文件不存在：${sanitizedFilename}`);
    }

    fs.unlinkSync(filePath);
    this.logger.log(`备份文件已删除：${sanitizedFilename}`);
    return { message: `备份文件 ${sanitizedFilename} 已删除` };
  }
}
