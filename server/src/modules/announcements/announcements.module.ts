import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from '@database/entities';
import { PublicAnnouncementsController } from './public-announcements.controller';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement])],
  controllers: [PublicAnnouncementsController, AdminAnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
