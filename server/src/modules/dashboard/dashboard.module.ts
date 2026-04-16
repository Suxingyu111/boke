import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, Category, Tag, Page, FriendLink } from '@database/entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article, Category, Tag, Page, FriendLink])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
