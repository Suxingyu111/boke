import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, ArticleTag, ArticleVersion, Category, Tag, User } from '@database/entities';
import { AdminArticleVersionsController } from './admin-article-versions.controller';
import { AdminArticlesController } from './admin-articles.controller';
import { ArticleVersionsService } from './article-versions.service';
import { PublicArticlesController } from './public-articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article, Category, Tag, ArticleTag, ArticleVersion, User])],
  controllers: [AdminArticlesController, AdminArticleVersionsController, PublicArticlesController],
  providers: [ArticlesService, ArticleVersionsService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
