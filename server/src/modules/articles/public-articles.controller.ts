import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@database/entities';
import { NoStoreResponse } from '@common/security/decorators/no-store-response.decorator';
import { ResponseCache } from '@common/security/decorators/response-cache.decorator';
import { extractClientIp, extractUserAgent } from '@common/security/request-metadata.util';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ArticlesService } from './articles.service';
import { PublicListArticlesDto } from './dto/public-list-articles.dto';

type PublicArticleRequest = Request & {
  user?: User | null;
};

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
  @ResponseCache({ keyPrefix: 'articles:list', ttlSeconds: 180, clientTtlSeconds: 60 })
  findList(@Query() query: PublicListArticlesDto) {
    return this.articlesService.findPublicList(query);
  }

  @Get(':id/like')
  @UseGuards(OptionalJwtAuthGuard)
  @NoStoreResponse()
  @ApiOperation({ summary: '获取文章点赞状态' })
  @ApiParam({ name: 'id', description: '文章 ID', type: String })
  @ApiResponse({ status: 200, description: '获取成功' })
  getLikeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: PublicArticleRequest,
  ) {
    return this.articlesService.getLikeStatus(
      id,
      extractClientIp(req),
      extractUserAgent(req),
      req.user ?? null,
    );
  }

  @Post(':id/like')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '点赞文章' })
  @ApiParam({ name: 'id', description: '文章 ID', type: String })
  @ApiResponse({ status: 201, description: '点赞成功' })
  likeArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: PublicArticleRequest,
  ) {
    return this.articlesService.likeArticle(
      id,
      extractClientIp(req),
      extractUserAgent(req),
      req.user ?? null,
    );
  }

  @Delete(':id/like')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '取消点赞文章' })
  @ApiParam({ name: 'id', description: '文章 ID', type: String })
  @ApiResponse({ status: 200, description: '取消成功' })
  unlikeArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: PublicArticleRequest,
  ) {
    return this.articlesService.unlikeArticle(
      id,
      extractClientIp(req),
      extractUserAgent(req),
      req.user ?? null,
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: '获取文章详情' })
  @ApiParam({ name: 'slug', description: '文章 slug', type: String })
  @ApiResponse({ status: 200, description: '获取成功' })
  findDetail(@Param('slug') slug: string) {
    return this.articlesService.findPublicDetail(slug);
  }
}
