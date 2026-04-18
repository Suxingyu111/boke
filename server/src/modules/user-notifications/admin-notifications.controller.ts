import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsString, MaxLength } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserNotificationsService } from './user-notifications.service';

class BroadcastNotificationDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  content: string;

  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: UserNotificationsService) {}

  /** 批量发送系统通知 */
  @Post('broadcast')
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.broadcastNotification(dto.title, dto.content, dto.userIds);
  }
}
