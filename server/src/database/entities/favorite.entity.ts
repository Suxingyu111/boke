import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Article } from './article.entity';

@Entity('favorites')
@Index('idx_favorites_user_article', ['userId', 'articleId'], { unique: true })
@Index('idx_favorites_user_created', ['userId', 'createdAt'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'article_id', type: 'char', length: 36 })
  articleId: string;

  @ManyToOne(() => Article, { nullable: false })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
