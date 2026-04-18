import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from '@database/entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /** 收藏文章 */
  @Post(':articleId')
  addFavorite(
    @CurrentUser() user: User,
    @Param('articleId', ParseUUIDPipe) articleId: string,
  ) {
    return this.favoritesService.addFavorite(user.id, articleId);
  }

  /** 取消收藏 */
  @Delete(':articleId')
  removeFavorite(
    @CurrentUser() user: User,
    @Param('articleId', ParseUUIDPipe) articleId: string,
  ) {
    return this.favoritesService.removeFavorite(user.id, articleId);
  }

  /** 判断是否已收藏 */
  @Get(':articleId/check')
  isFavorited(
    @CurrentUser() user: User,
    @Param('articleId', ParseUUIDPipe) articleId: string,
  ) {
    return this.favoritesService.isFavorited(user.id, articleId);
  }

  /** 批量判断收藏状态 */
  @Post('batch-check')
  batchCheckFavorited(
    @CurrentUser() user: User,
    @Body('articleIds') articleIds: string[],
  ) {
    return this.favoritesService.batchCheckFavorited(user.id, articleIds);
  }
}
