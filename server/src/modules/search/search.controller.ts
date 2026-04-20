import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ResponseCache } from '@common/security/decorators/response-cache.decorator';
import { SearchService } from './search.service';
import { SearchArticlesDto } from './dto/search-articles.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /** 公开全文搜索接口 */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ResponseCache({ keyPrefix: 'search:public', ttlSeconds: 120, clientTtlSeconds: 60 })
  search(@Query() dto: SearchArticlesDto) {
    return this.searchService.searchArticles(dto);
  }
}
