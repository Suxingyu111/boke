import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Response } from 'express';
import { User } from '@database/entities';
import { SanitizePipe } from '../../common/pipes/sanitize.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ExportArticleDto } from './dto/export-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Controller('admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('author')
@UsePipes(SanitizePipe)
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

  @Get(':id/export')
  async exportArticle(
    @Param('id') id: string,
    @Query() query: ExportArticleDto,
    @CurrentUser() currentUser: User,
    @Res() response: Response,
  ) {
    const exported = await this.articlesService.exportArticle(id, query.format ?? 'markdown', currentUser);
    response.setHeader('Content-Type', exported.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${exported.fileName}"`);
    return response.send(exported.content);
  }

  @Delete(':id/permanent')
  permanentRemove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.articlesService.permanentRemove(id, currentUser);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto, @CurrentUser() currentUser: User) {
    return this.articlesService.update(id, dto, currentUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.articlesService.remove(id, currentUser);
  }
}
