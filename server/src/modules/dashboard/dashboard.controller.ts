import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** 获取仪表盘统计信息 */
  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  /** 获取最近文章列表 */
  @Get('recent-articles')
  getRecentArticles(@Query('limit') limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit ?? '10', 10) || 10, 1), 50);
    return this.dashboardService.getRecentArticles(parsedLimit);
  }
}
