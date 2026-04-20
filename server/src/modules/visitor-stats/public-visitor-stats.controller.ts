import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { extractClientIp, extractUserAgent } from '@common/security/request-metadata.util';
import { RecordVisitDto } from './dto/record-visit.dto';
import { VisitorStatsService } from './visitor-stats.service';

@Controller('stats')
export class PublicVisitorStatsController {
  constructor(private readonly visitorStatsService: VisitorStatsService) {}

  /** 记录页面访问（前端调用） */
  @Post('visit')
  recordVisit(@Body() dto: RecordVisitDto, @Req() req: Request) {
    return this.visitorStatsService.recordVisit(
      dto,
      extractClientIp(req) ?? '',
      extractUserAgent(req),
    );
  }
}
