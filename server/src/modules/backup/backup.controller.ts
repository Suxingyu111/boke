import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { sanitizeAttachmentFileName } from '@common/security/file-validation.util';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BackupService } from './backup.service';

@Controller('admin/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /** 创建数据库备份 */
  @Post()
  createBackup() {
    return this.backupService.createBackup();
  }

  /** 获取备份文件列表 */
  @Get()
  listBackups() {
    return this.backupService.listBackups();
  }

  /** 下载备份文件 */
  @Get(':filename/download')
  downloadBackup(@Param('filename') filename: string, @Res() res: Response) {
    const streamable = this.backupService.downloadBackup(filename);
    const sanitizedFilename = sanitizeAttachmentFileName(filename, ['.sql']);
    res.set({
      'Content-Type': 'application/sql',
      'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
    });
    streamable.getStream().pipe(res);
  }

  /** 恢复指定备份 */
  @Post(':filename/restore')
  restoreBackup(@Param('filename') filename: string) {
    return this.backupService.restoreBackup(filename);
  }

  /** 删除备份文件 */
  @Delete(':filename')
  deleteBackup(@Param('filename') filename: string) {
    return this.backupService.deleteBackup(filename);
  }
}
