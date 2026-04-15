import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Article } from './article.entity';
import { Tag } from './tag.entity';

@Entity('article_tags')
@Index('idx_article_tags_tag_id', ['tagId'])
export class ArticleTag {
  @PrimaryColumn({ name: 'article_id', type: 'char', length: 36 })
  articleId: string;

  @PrimaryColumn({ name: 'tag_id', type: 'char', length: 36 })
  tagId: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}