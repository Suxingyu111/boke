import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseAdminController } from './database-admin.controller';
import { DatabaseAdminService } from './database-admin.service';

@Module({
  imports: [AuthModule],
  controllers: [DatabaseAdminController],
  providers: [DatabaseAdminService],
})
export class DatabaseAdminModule {}
