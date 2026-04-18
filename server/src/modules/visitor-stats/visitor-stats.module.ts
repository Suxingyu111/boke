import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorLog } from '@database/entities';
import { PublicVisitorStatsController } from './public-visitor-stats.controller';
import { AdminVisitorStatsController } from './admin-visitor-stats.controller';
import { VisitorStatsService } from './visitor-stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([VisitorLog])],
  controllers: [PublicVisitorStatsController, AdminVisitorStatsController],
  providers: [VisitorStatsService],
  exports: [VisitorStatsService],
})
export class VisitorStatsModule {}
