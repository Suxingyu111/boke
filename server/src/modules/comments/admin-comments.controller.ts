import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@database/entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { UpdateCommentStatusDto } from './dto/update-comment-status.dto';
import { CommentsService } from './comments.service';

@ApiTags('admin-comments')
@ApiBearerAuth('bearer')
@Controller('admin/comments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /** 获取全部评论 */
  @Get()
  @ApiOperation({ summary: '获取后台评论列表' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页数量' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'spam', 'rejected'],
  })
  @ApiQuery({ name: 'articleId', required: false, type: String, description: '文章 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
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
  @ApiOperation({ summary: '更新评论审核状态' })
  @ApiParam({ name: 'id', description: '评论 ID', type: String })
  @ApiResponse({ status: 200, description: '更新成功' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCommentStatusDto) {
    return this.commentsService.updateStatus(id, dto.status);
  }

  /** 管理员回复评论 */
  @Post(':id/reply')
  @ApiOperation({ summary: '管理员回复评论' })
  @ApiParam({ name: 'id', description: '父评论 ID', type: String })
  @ApiResponse({ status: 201, description: '回复成功' })
  reply(@Param('id') id: string, @Body() dto: ReplyCommentDto, @CurrentUser() currentUser: User) {
    return this.commentsService.adminReply(id, dto, currentUser);
  }

  /** 删除评论 */
  @Delete(':id')
  @ApiOperation({ summary: '删除评论及其子回复' })
  @ApiParam({ name: 'id', description: '评论 ID', type: String })
  @ApiResponse({ status: 200, description: '删除成功' })
  deleteComment(@Param('id') id: string) {
    return this.commentsService.deleteComment(id);
  }
}
