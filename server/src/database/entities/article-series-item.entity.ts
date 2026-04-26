import {
  CreateDateColumn,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Article } from './article.entity';
import { ArticleSeries } from './article-series.entity';

@Entity('article_series_items')
@Index('uk_series_order', ['seriesId', 'sortOrder'], { unique: true })
export class ArticleSeriesItem {
  @PrimaryColumn({ name: 'series_id', type: 'varchar', length: 36 })
  seriesId: string;

  @PrimaryColumn({ name: 'article_id', type: 'varchar', length: 36 })
  articleId: string;

  @ManyToOne(() => ArticleSeries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'series_id', foreignKeyConstraintName: 'fk_article_series_items_series' })
  series!: ArticleSeries;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id', foreignKeyConstraintName: 'fk_article_series_items_article' })
  article!: Article;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}