import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationLog } from '@database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminOperationLogsController } from './admin-operation-logs.controller';
import { OperationLogsService } from './operation-logs.service';
import { SecurityAuditService } from './security-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([OperationLog]), NotificationsModule],
  controllers: [AdminOperationLogsController],
  providers: [OperationLogsService, SecurityAuditService],
  exports: [OperationLogsService, SecurityAuditService],
})
export class OperationLogsModule {}
