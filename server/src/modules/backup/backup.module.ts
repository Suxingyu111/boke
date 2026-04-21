import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
