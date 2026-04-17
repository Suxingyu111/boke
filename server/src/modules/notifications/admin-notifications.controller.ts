import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { SubscriptionService } from './subscription.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /** 发送邮件通知 */
  @Post('send')
  sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(dto);
  }

  /** 通知所有订阅者（新文章） */
  @Post('notify-subscribers')
  notifySubscribers(@Body() body: { articleTitle: string; articleSlug: string }) {
    return this.notificationsService.notifySubscribersNewArticle(
      body.articleTitle,
      body.articleSlug,
    );
  }

  /** 重试失败的通知 */
  @Post('retry-failed')
  retryFailed() {
    return this.notificationsService.retryFailed();
  }

  /** 获取通知列表 */
  @Get()
  getNotifications(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.notificationsService.getNotifications(Number(page) || 1, Number(pageSize) || 20);
  }

  /** 获取订阅者列表 */
  @Get('subscribers')
  getSubscribers(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.subscriptionService.getSubscribers(Number(page) || 1, Number(pageSize) || 20);
  }

  /** 删除订阅者 */
  @Delete('subscribers/:id')
  removeSubscriber(@Param('id') id: string) {
    return this.subscriptionService.removeSubscriber(id);
  }
}
