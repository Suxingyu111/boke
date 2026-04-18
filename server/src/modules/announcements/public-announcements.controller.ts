import { Controller, Get, Query } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class PublicAnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  /** 获取已发布的公告列表 */
  @Get()
  getPublishedAnnouncements(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.announcementsService.getPublishedAnnouncements(page, pageSize);
  }

  /** 获取最新的置顶公告 */
  @Get('pinned')
  getLatestPinned() {
    return this.announcementsService.getLatestPinnedAnnouncement();
  }
}
