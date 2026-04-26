import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Article } from './article.entity';
import { User } from './user.entity';

@Entity('article_likes')
@Index('idx_article_likes_article_created', ['articleId', 'createdAt'])
@Index('idx_article_likes_user', ['userId'])
@Index('idx_article_likes_article_visitor', ['articleId', 'visitorKey'], {
  unique: true,
})
export class ArticleLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_id', type: 'varchar', length: 36 })
  articleId: string;

  @ManyToOne(() => Article, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id', foreignKeyConstraintName: 'fk_article_likes_article' })
  article!: Article;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_article_likes_user' })
  user!: User | null;

  @Column({ name: 'visitor_key', type: 'varchar', length: 80 })
  visitorKey: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
