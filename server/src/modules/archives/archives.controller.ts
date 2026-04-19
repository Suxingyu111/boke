import { Controller, Get, Query } from '@nestjs/common';
import { ArchivesService } from './archives.service';
import { ArchiveQueryDto } from './dto/archive-query.dto';

@Controller('archives')
export class ArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  /** 获取归档统计概览（各年月文章数） */
  @Get()
  getSummary() {
    return this.archivesService.getArchiveSummary();
  }

  /** 获取某年某月的文章列表 */
  @Get('articles')
  getArticles(@Query() query: ArchiveQueryDto) {
    return this.archivesService.getArchiveArticles(
      query.year,
      query.month,
      query.page ?? 1,
      query.pageSize ?? 10,
    );
  }
}
