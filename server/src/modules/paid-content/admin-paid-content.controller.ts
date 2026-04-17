import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@database/entities';
import { PaidContentService } from './paid-content.service';
import { SetPaidContentDto } from './dto/set-paid-content.dto';

@Controller('admin/paid-content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('author')
export class AdminPaidContentController {
  constructor(private readonly paidContentService: PaidContentService) {}

  /** 设置文章付费 */
  @Put(':articleId')
  setPaidContent(
    @Param('articleId') articleId: string,
    @Body() dto: SetPaidContentDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.paidContentService.setPaidContent(articleId, dto, currentUser);
  }

  /** 移除付费设置 */
  @Delete(':articleId')
  removePaidContent(@Param('articleId') articleId: string, @CurrentUser() currentUser: User) {
    return this.paidContentService.removePaidContent(articleId, currentUser);
  }

  /** 获取文章购买记录 */
  @Get(':articleId/purchases')
  @Roles('admin')
  getPurchaseRecords(@Param('articleId') articleId: string) {
    return this.paidContentService.getPurchaseRecords(articleId);
  }
}
