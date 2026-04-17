import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchArticlesDto } from './dto/search-articles.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /** 公开全文搜索接口 */
  @Get()
  search(@Query() dto: SearchArticlesDto) {
    return this.searchService.searchArticles(dto);
  }
}
