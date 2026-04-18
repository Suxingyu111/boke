import { Controller, Get, Param } from '@nestjs/common';
import { ArticleSeriesService } from './article-series.service';

@Controller('series')
export class PublicArticleSeriesController {
  constructor(private readonly articleSeriesService: ArticleSeriesService) {}

  @Get()
  findList() {
    return this.articleSeriesService.findPublicList();
  }

  @Get(':slug')
  findDetail(@Param('slug') slug: string) {
    return this.articleSeriesService.findPublicDetail(slug);
  }
}