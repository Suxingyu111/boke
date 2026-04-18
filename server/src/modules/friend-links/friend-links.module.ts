import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendLink } from '@database/entities';
import { PublicFriendLinksController } from './public-friend-links.controller';
import { AdminFriendLinksController } from './admin-friend-links.controller';
import { FriendLinksService } from './friend-links.service';

@Module({
  imports: [TypeOrmModule.forFeature([FriendLink])],
  controllers: [PublicFriendLinksController, AdminFriendLinksController],
  providers: [FriendLinksService],
  exports: [FriendLinksService],
})
export class FriendLinksModule {}
