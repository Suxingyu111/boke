import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '@database/entities';
import { ArticleVersionsService } from './article-versions.service';
import { ListArticleVersionsDto } from './dto/list-article-versions.dto';
import { RestoreArticleVersionDto } from './dto/restore-article-version.dto';

@Controller('admin/articles/:articleId/versions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('author')
export class AdminArticleVersionsController {
  constructor(private readonly articleVersionsService: ArticleVersionsService) {}

  @Get()
  findList(
    @Param('articleId') articleId: string,
    @Query() query: ListArticleVersionsDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.articleVersionsService.listVersions(
      articleId,
      currentUser,
      query.page ?? 1,
      query.pageSize ?? 10,
    );
  }

  @Get(':versionId')
  findDetail(
    @Param('articleId') articleId: string,
    @Param('versionId') versionId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.articleVersionsService.getVersionDetail(articleId, versionId, currentUser);
  }

  @Post(':versionId/restore')
  restore(
    @Param('articleId') articleId: string,
    @Param('versionId') versionId: string,
    @Body() dto: RestoreArticleVersionDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.articleVersionsService.restoreVersion(
      articleId,
      versionId,
      currentUser,
      dto.changeNote,
    );
  }
}