import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Article } from './article.entity';
import { User } from './user.entity';

@Entity('article_versions')
@Index('uk_article_versions_article_version', ['articleId', 'versionNo'], { unique: true })
@Index('idx_article_versions_operator', ['operatorId'])
export class ArticleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_id', type: 'varchar', length: 36 })
  articleId: string;

  @ManyToOne(() => Article, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id', foreignKeyConstraintName: 'fk_article_versions_article' })
  article!: Article;

  @Column({ name: 'version_no', type: 'int' })
  versionNo: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ name: 'summary', type: 'text', nullable: true })
  excerpt: string | null;

  @Column({ name: 'content_markdown', type: 'longtext' })
  content: string;

  @Column({ name: 'content_html', type: 'longtext', nullable: true })
  contentHtml: string | null;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 500, nullable: true })
  coverImage: string | null;

  @Column({ name: 'category_id', type: 'varchar', length: 36 })
  categoryId: string;

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

  @Column({ name: 'seo_title', type: 'varchar', length: 255, nullable: true })
  seoTitle: string | null;

  @Column({ name: 'seo_description', type: 'varchar', length: 500, nullable: true })
  seoDescription: string | null;

  @Column({ name: 'seo_keywords', type: 'varchar', length: 255, nullable: true })
  seoKeywords: string | null;

  @Column({ name: 'scheduled_at', type: 'datetime', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'tag_ids', type: 'json', nullable: true })
  tagIds: string[] | null;

  @Column({ name: 'operator_id', type: 'varchar', length: 36, nullable: true })
  operatorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operator_id', foreignKeyConstraintName: 'fk_article_versions_operator' })
  operator!: User | null;

  @Column({ name: 'change_note', type: 'varchar', length: 255, nullable: true })
  changeNote: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}