import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, ArticlePurchase, PaidContent, User } from '@database/entities';
import { PaidContentService } from './paid-content.service';
import { AdminPaidContentController } from './admin-paid-content.controller';
import { PublicPaidContentController } from './public-paid-content.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaidContent, ArticlePurchase, Article, User])],
  controllers: [AdminPaidContentController, PublicPaidContentController],
  providers: [PaidContentService],
  exports: [PaidContentService],
})
export class PaidContentModule {}
