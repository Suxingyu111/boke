import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ResponseCache } from '@common/security/decorators/response-cache.decorator';
import { ArchivesService } from './archives.service';
import { ArchiveQueryDto } from './dto/archive-query.dto';

@Controller('archives')
export class ArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  /** 获取归档统计概览（各年月文章数） */
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ResponseCache({ keyPrefix: 'archives:summary', ttlSeconds: 300, clientTtlSeconds: 120 })
  getSummary() {
    return this.archivesService.getArchiveSummary();
  }

  /** 获取某年某月的文章列表 */
  @Get('articles')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  @ResponseCache({ keyPrefix: 'archives:articles', ttlSeconds: 300, clientTtlSeconds: 120 })
  getArticles(@Query() query: ArchiveQueryDto) {
    return this.archivesService.getArchiveArticles(
      query.year,
      query.month,
      query.page ?? 1,
      query.pageSize ?? 10,
    );
  }
}
