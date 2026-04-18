import { CreateDateColumn, Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('article_series_items')
@Index('uk_series_order', ['seriesId', 'sortOrder'], { unique: true })
export class ArticleSeriesItem {
  @PrimaryColumn({ name: 'series_id', type: 'char', length: 36 })
  seriesId: string;

  @PrimaryColumn({ name: 'article_id', type: 'char', length: 36 })
  articleId: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}