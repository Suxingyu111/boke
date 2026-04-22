import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { OperationLogsModule } from '../operation-logs/operation-logs.module';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

@Module({
  imports: [ConfigModule, AuthModule, OperationLogsModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
