import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@database/entities';
import { CollaborationService } from './collaboration.service';
import { AddCollaboratorDto } from './dto/add-collaborator.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';

@Controller('admin/collaboration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('author')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  /** 添加协作者 */
  @Post(':articleId/collaborators')
  addCollaborator(
    @Param('articleId') articleId: string,
    @Body() dto: AddCollaboratorDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.collaborationService.addCollaborator(articleId, dto, currentUser);
  }

  /** 移除协作者 */
  @Delete(':articleId/collaborators/:collaboratorId')
  removeCollaborator(
    @Param('articleId') articleId: string,
    @Param('collaboratorId') collaboratorId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.collaborationService.removeCollaborator(articleId, collaboratorId, currentUser);
  }

  /** 获取协作者列表 */
  @Get(':articleId/collaborators')
  getCollaborators(@Param('articleId') articleId: string, @CurrentUser() currentUser: User) {
    return this.collaborationService.getCollaborators(articleId, currentUser);
  }

  /** 协作编辑草稿 */
  @Patch(':articleId/draft')
  updateDraft(
    @Param('articleId') articleId: string,
    @Body() dto: UpdateDraftDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.collaborationService.updateDraft(articleId, dto, currentUser);
  }

  /** 获取编辑历史 */
  @Get(':articleId/history')
  getEditHistory(@Param('articleId') articleId: string, @CurrentUser() currentUser: User) {
    return this.collaborationService.getEditHistory(articleId, currentUser);
  }
}
