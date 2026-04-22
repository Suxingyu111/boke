import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OperationLogsModule } from '../operation-logs/operation-logs.module';
import { DatabaseAdminController } from './database-admin.controller';
import { DatabaseAdminService } from './database-admin.service';

@Module({
  imports: [AuthModule, OperationLogsModule],
  controllers: [DatabaseAdminController],
  providers: [DatabaseAdminService],
})
export class DatabaseAdminModule {}
