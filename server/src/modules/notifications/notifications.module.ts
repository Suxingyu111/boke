import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailNotification, EmailSubscriber } from '@database/entities';
import { NotificationsService } from './notifications.service';
import { SubscriptionService } from './subscription.service';
import { AdminNotificationsController } from './admin-notifications.controller';
import { PublicSubscriptionController } from './public-subscription.controller';
import { EmailTransportProvider } from './email-transport.provider';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([EmailNotification, EmailSubscriber])],
  controllers: [AdminNotificationsController, PublicSubscriptionController],
  providers: [EmailTransportProvider, NotificationsService, SubscriptionService],
  exports: [NotificationsService, SubscriptionService],
})
export class NotificationsModule {}
