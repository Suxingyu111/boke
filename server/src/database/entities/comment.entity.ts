import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Article } from './article.entity';
import { User } from './user.entity';

@Entity('comments')
@Index('idx_comments_article_status_created', ['articleId', 'status', 'createdAt'])
@Index('idx_comments_parent_id', ['parentId'])
@Index('idx_comments_user_id', ['userId'])
@Index('idx_comments_author_email', ['authorEmail'])
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_id', type: 'char', length: 36 })
  articleId: string;

  @ManyToOne(() => Article, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'parent_id', type: 'char', length: 36, nullable: true })
  parentId: string | null;

  @ManyToOne(() => CommentEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: CommentEntity | null;

  @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'author_name', type: 'varchar', length: 100 })
  authorName: string;

  @Column({ name: 'author_email', type: 'varchar', length: 255 })
  authorEmail: string;

  @Column({ name: 'author_website', type: 'varchar', length: 255, nullable: true })
  authorWebsite: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'spam', 'rejected'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'spam' | 'rejected';

  @Column({ name: 'replied_at', type: 'datetime', nullable: true })
  repliedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;
}