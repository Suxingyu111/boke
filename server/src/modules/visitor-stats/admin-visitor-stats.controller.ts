import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VisitorStatsService } from './visitor-stats.service';

function parsePositiveInt(value: string | undefined, fallback: number, field: string): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${field} 必须为正整数`);
  }

  return parsed;
}

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
    @Query('limit') limit?: string,
    @Query('days') days?: string,
  ) {
    return this.visitorStatsService.getTopPages(
      parsePositiveInt(limit, 20, 'limit'),
      parsePositiveInt(days, 30, 'days'),
    );
  }

  /** 获取来源统计 */
  @Get('referers')
  getRefererStats(@Query('days') days?: string) {
    return this.visitorStatsService.getRefererStats(parsePositiveInt(days, 30, 'days'));
  }

  /** 获取设备/浏览器/系统统计 */
  @Get('devices')
  getDeviceStats(@Query('days') days?: string) {
    return this.visitorStatsService.getDeviceStats(parsePositiveInt(days, 30, 'days'));
  }
}
