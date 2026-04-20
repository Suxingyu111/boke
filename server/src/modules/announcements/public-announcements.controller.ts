import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class PublicAnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  /** 获取已发布的公告列表 */
  @Get()
  getPublishedAnnouncements(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
  ) {
    return this.announcementsService.getPublishedAnnouncements(page, pageSize);
  }

  /** 获取最新的置顶公告 */
  @Get('pinned')
  getLatestPinned() {
    return this.announcementsService.getLatestPinnedAnnouncement();
  }
}
