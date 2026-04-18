import { Body, Controller, Get, Post, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { User } from '@database/entities';
import { SanitizePipe } from '../../common/pipes/sanitize.pipe';
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

@Controller('articles/:articleId/comments')
export class PublicCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /** 获取文章公开评论列表 */
  @Get()
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
  @UsePipes(SanitizePipe)
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
