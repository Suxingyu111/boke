import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, CommentEntity, User } from '@database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { AdminCommentsController } from './admin-comments.controller';
import { PublicCommentsController } from './public-comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommentEntity, Article, User]),
    NotificationsModule,
    UserNotificationsModule,
  ],
  controllers: [PublicCommentsController, AdminCommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}