import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@database/entities';
import { PaidContentService } from './paid-content.service';
import { PurchaseArticleDto } from './dto/purchase-article.dto';

@Controller('paid-content')
export class PublicPaidContentController {
  constructor(private readonly paidContentService: PaidContentService) {}

  /** 获取文章付费信息 */
  @Get(':articleId/info')
  getPaidInfo(@Param('articleId') articleId: string) {
    return this.paidContentService.getPaidInfo(articleId);
  }

  /** 获取文章内容（自动处理付费裁剪） */
  @Get(':articleId/content')
  @UseGuards(OptionalJwtAuthGuard)
  getContent(@Param('articleId') articleId: string, @CurrentUser() currentUser: User | null) {
    return this.paidContentService.getArticleContent(articleId, currentUser?.id);
  }

  /** 购买文章 */
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  purchase(@Body() dto: PurchaseArticleDto, @CurrentUser() currentUser: User) {
    return this.paidContentService.purchaseArticle(dto, currentUser);
  }

  /** 检查是否已购买 */
  @Get(':articleId/check')
  @UseGuards(JwtAuthGuard)
  checkPurchase(@Param('articleId') articleId: string, @CurrentUser() currentUser: User) {
    return this.paidContentService.hasPurchased(articleId, currentUser.id);
  }

  /** 获取我购买的文章 */
  @Get('my-purchases')
  @UseGuards(JwtAuthGuard)
  getMyPurchases(@CurrentUser() currentUser: User) {
    return this.paidContentService.getUserPurchases(currentUser.id);
  }
}
