import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@database/entities';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';

@Controller('admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('author')
export class AdminArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  create(@Body() dto: CreateArticleDto, @CurrentUser() currentUser: User) {
    return this.articlesService.create(dto, currentUser);
  }

  @Get()
  findList(@Query() query: ListArticlesDto, @CurrentUser() currentUser: User) {
    return this.articlesService.findAdminList(query, currentUser);
  }

  @Get(':id')
  findDetail(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.articlesService.findAdminDetail(id, currentUser);
  }

  @Delete(':id/permanent')
  permanentRemove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.articlesService.permanentRemove(id, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.articlesService.update(id, dto, currentUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.articlesService.remove(id, currentUser);
  }
}
