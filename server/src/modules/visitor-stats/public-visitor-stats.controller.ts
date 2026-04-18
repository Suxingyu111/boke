import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { RecordVisitDto } from './dto/record-visit.dto';
import { VisitorStatsService } from './visitor-stats.service';

@Controller('stats')
export class PublicVisitorStatsController {
  constructor(private readonly visitorStatsService: VisitorStatsService) {}

  /** 记录页面访问（前端调用） */
  @Post('visit')
  recordVisit(@Body() dto: RecordVisitDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const userAgent = req.headers['user-agent'] || null;
    return this.visitorStatsService.recordVisit(dto, ip, userAgent);
  }
}
