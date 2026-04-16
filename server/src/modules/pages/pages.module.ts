import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendLink, Page } from '@database/entities';
import { AdminPagesController } from './admin-pages.controller';
import { PublicPagesController } from './public-pages.controller';
import { PagesService } from './pages.service';

@Module({
  imports: [TypeOrmModule.forFeature([Page, FriendLink])],
  controllers: [AdminPagesController, PublicPagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
