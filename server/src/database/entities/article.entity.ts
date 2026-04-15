import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';

@Entity('articles')
@Index('idx_articles_slug', ['slug'], { unique: true })
@Index('idx_articles_category_status', ['categoryId', 'status'])
@Index('idx_articles_author_status', ['userId', 'status'])
@Index('idx_articles_publish_sort', ['isTop', 'publishedAt'])
@Index('idx_articles_scheduled_at', ['scheduledAt'])
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ name: 'summary', type: 'text', nullable: true })
  excerpt: string;

  @Column({ name: 'content_markdown', type: 'longtext' })
  content: string;

  @Column({ name: 'content_html', type: 'longtext', nullable: true })
  contentHtml: string | null;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 500, nullable: true })
  coverImage: string;

  @Column({ name: 'category_id', type: 'char', length: 36 })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({
    type: 'enum',
    enum: ['draft', 'scheduled', 'published', 'archived'],
    default: 'draft',
  })
  status: 'draft' | 'scheduled' | 'published' | 'archived';

  @Column({
    type: 'enum',
    enum: ['public', 'private', 'password'],
    default: 'public',
  })
  visibility: 'public' | 'private' | 'password';

  @Column({ name: 'allow_comment', type: 'boolean', default: true })
  allowComment: boolean;

  @Column({ name: 'is_top', type: 'boolean', default: false })
  isTop: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likes: number;

  @Column({ name: 'comment_count', type: 'int', default: 0 })
  commentCount: number;

  @Column({ name: 'seo_title', type: 'varchar', length: 255, nullable: true })
  seoTitle: string | null;

  @Column({ name: 'seo_description', type: 'varchar', length: 500, nullable: true })
  seoDescription: string | null;

  @Column({ name: 'seo_keywords', type: 'varchar', length: 255, nullable: true })
  seoKeywords: string | null;

  @Column({ name: 'author_id', type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'scheduled_at', type: 'datetime', nullable: true })
  scheduledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt: Date;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;
}
