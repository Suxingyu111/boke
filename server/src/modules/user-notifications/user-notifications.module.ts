import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotification } from '@database/entities';
import { UserNotificationsController } from './user-notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { UserNotificationsService } from './user-notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserNotification])],
  controllers: [UserNotificationsController, AdminNotificationsController],
  providers: [UserNotificationsService],
  exports: [UserNotificationsService],
})
export class UserNotificationsModule {}
