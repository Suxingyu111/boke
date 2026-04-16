import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { PublicListArticlesDto } from './dto/public-list-articles.dto';

@Controller('articles')
export class PublicArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  findList(@Query() query: PublicListArticlesDto) {
    return this.articlesService.findPublicList(query);
  }

  @Get(':slug')
  findDetail(@Param('slug') slug: string) {
    return this.articlesService.findPublicDetail(slug);
  }
}
