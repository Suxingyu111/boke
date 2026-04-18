import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UsePipes } from '@nestjs/common';
import { User } from '@database/entities';
import { SanitizePipe } from '../../common/pipes/sanitize.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { UpdateCommentStatusDto } from './dto/update-comment-status.dto';
import { CommentsService } from './comments.service';

@Controller('admin/comments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /** 获取全部评论 */
  @Get()
  getComments(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('status') status?: 'pending' | 'approved' | 'spam' | 'rejected',
    @Query('articleId') articleId?: string,
  ) {
    return this.commentsService.getAdminComments(page, pageSize, status, articleId);
  }

  /** 更新评论审核状态 */
  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCommentStatusDto) {
    return this.commentsService.updateStatus(id, dto.status);
  }

  /** 管理员回复评论 */
  @Post(':id/reply')
  @UsePipes(SanitizePipe)
  reply(@Param('id') id: string, @Body() dto: ReplyCommentDto, @CurrentUser() currentUser: User) {
    return this.commentsService.adminReply(id, dto, currentUser);
  }

  /** 删除评论 */
  @Delete(':id')
  deleteComment(@Param('id') id: string) {
    return this.commentsService.deleteComment(id);
  }
}