import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User } from '@database/entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserNotificationsService } from './user-notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationsController {
  constructor(private readonly notificationsService: UserNotificationsService) {}

  /** 获取我的通知列表 */
  @Get()
  getMyNotifications(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('unreadOnly') unreadOnly = false,
  ) {
    return this.notificationsService.getUserNotifications(user.id, page, pageSize, unreadOnly);
  }

  /** 获取未读通知数量 */
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id).then(count => ({ count }));
  }

  /** 标记单个通知为已读 */
  @Put(':id/read')
  markAsRead(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  /** 全部标记为已读 */
  @Put('read-all')
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  /** 删除通知 */
  @Delete(':id')
  deleteNotification(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.deleteNotification(user.id, id);
  }
}
