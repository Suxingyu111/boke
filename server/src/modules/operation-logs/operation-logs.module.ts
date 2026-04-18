import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationLog } from '@database/entities';
import { AdminOperationLogsController } from './admin-operation-logs.controller';
import { OperationLogsService } from './operation-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([OperationLog])],
  controllers: [AdminOperationLogsController],
  providers: [OperationLogsService],
  exports: [OperationLogsService],
})
export class OperationLogsModule {}