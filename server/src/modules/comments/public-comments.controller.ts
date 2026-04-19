import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { User } from '@database/entities';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsService, type PublicCommentView } from './comments.service';

type CommentRequest = Request & {
  user?: User | null;
};

interface PublicCommentPage {
  items: PublicCommentView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@ApiTags('comments')
@Controller('articles/:articleId/comments')
export class PublicCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /** 获取文章公开评论列表 */
  @Get()
  @ApiOperation({ summary: '获取文章公开评论列表' })
  @ApiParam({ name: 'articleId', description: '文章 ID', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页数量' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getApprovedComments(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Req() req: CommentRequest,
  ): Promise<PublicCommentPage> {
    return this.commentsService.getApprovedComments(req.params.articleId, page, pageSize);
  }

  /** 提交文章评论 */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '提交文章评论' })
  @ApiParam({ name: 'articleId', description: '文章 ID', type: String })
  @ApiResponse({ status: 201, description: '提交成功，等待审核' })
  createComment(@Body() dto: CreateCommentDto, @Req() req: CommentRequest) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
    const userAgent = req.headers['user-agent'] ?? null;

    return this.commentsService.createComment(
      req.params.articleId,
      dto,
      ip,
      userAgent,
      req.user ?? null,
    );
  }
}
