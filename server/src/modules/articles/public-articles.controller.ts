import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { PublicListArticlesDto } from './dto/public-list-articles.dto';

@ApiTags('articles')
@Controller('articles')
export class PublicArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: '获取公开文章列表' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: '分类 ID' })
  @ApiQuery({ name: 'tagId', required: false, type: String, description: '标签 ID' })
  @ApiQuery({ name: 'keyword', required: false, type: String, description: '搜索关键字' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt', 'publishedAt', 'viewCount'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: '获取成功' })
  findList(@Query() query: PublicListArticlesDto) {
    return this.articlesService.findPublicList(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: '获取文章详情' })
  @ApiParam({ name: 'slug', description: '文章 slug', type: String })
  @ApiResponse({ status: 200, description: '获取成功' })
  findDetail(@Param('slug') slug: string) {
    return this.articlesService.findPublicDetail(slug);
  }
}
