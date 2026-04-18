import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, ArticleSeries, ArticleSeriesItem } from '@database/entities';
import { AdminArticleSeriesController } from './admin-article-series.controller';
import { ArticleSeriesService } from './article-series.service';
import { PublicArticleSeriesController } from './public-article-series.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Article, ArticleSeries, ArticleSeriesItem])],
  controllers: [AdminArticleSeriesController, PublicArticleSeriesController],
  providers: [ArticleSeriesService],
  exports: [ArticleSeriesService],
})
export class ArticleSeriesModule {}