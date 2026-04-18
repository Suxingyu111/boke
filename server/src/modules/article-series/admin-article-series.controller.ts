import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '@database/entities';
import { ArticleSeriesService } from './article-series.service';
import { CreateArticleSeriesDto } from './dto/create-article-series.dto';
import { ListArticleSeriesDto } from './dto/list-article-series.dto';
import { UpdateArticleSeriesDto } from './dto/update-article-series.dto';

@Controller('admin/series')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('author')
export class AdminArticleSeriesController {
  constructor(private readonly articleSeriesService: ArticleSeriesService) {}

  @Post()
  create(@Body() dto: CreateArticleSeriesDto, @CurrentUser() currentUser: User) {
    return this.articleSeriesService.create(dto, currentUser);
  }

  @Get()
  findList(@Query() query: ListArticleSeriesDto, @CurrentUser() currentUser: User) {
    return this.articleSeriesService.findAdminList(query.page ?? 1, query.pageSize ?? 10, currentUser);
  }

  @Get(':id')
  findDetail(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.articleSeriesService.findAdminDetail(id, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleSeriesDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.articleSeriesService.update(id, dto, currentUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.articleSeriesService.remove(id, currentUser);
  }
}