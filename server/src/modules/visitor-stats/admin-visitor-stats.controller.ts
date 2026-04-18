import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VisitorStatsService } from './visitor-stats.service';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminVisitorStatsController {
  constructor(private readonly visitorStatsService: VisitorStatsService) {}

  /** 获取今日访问统计 */
  @Get('today')
  getTodayStats() {
    return this.visitorStatsService.getTodayStats();
  }

  /** 获取日期范围统计 */
  @Get('range')
  getStatsRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.visitorStatsService.getStatsRange(startDate, endDate);
  }

  /** 获取热门页面 */
  @Get('top-pages')
  getTopPages(
    @Query('limit') limit = 20,
    @Query('days') days = 30,
  ) {
    return this.visitorStatsService.getTopPages(limit, days);
  }

  /** 获取来源统计 */
  @Get('referers')
  getRefererStats(@Query('days') days = 30) {
    return this.visitorStatsService.getRefererStats(days);
  }

  /** 获取设备/浏览器/系统统计 */
  @Get('devices')
  getDeviceStats(@Query('days') days = 30) {
    return this.visitorStatsService.getDeviceStats(days);
  }
}
