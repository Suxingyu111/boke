import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, ArticleTag, Category, Tag, User } from '@database/entities';
import { AdminArticlesController } from './admin-articles.controller';
import { PublicArticlesController } from './public-articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article, Category, Tag, ArticleTag, User])],
  controllers: [AdminArticlesController, PublicArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
