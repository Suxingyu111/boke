import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Article } from './article.entity';
import { User } from './user.entity';

@Entity('draft_edit_logs')
@Index('idx_draft_edit_article', ['articleId'])
@Index('idx_draft_edit_user', ['userId'])
export class DraftEditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_id', type: 'char', length: 36 })
  articleId: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'field_changed', type: 'varchar', length: 50 })
  fieldChanged: string;

  @Column({ name: 'old_value', type: 'longtext', nullable: true })
  oldValue: string | null;

  @Column({ name: 'new_value', type: 'longtext', nullable: true })
  newValue: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  summary: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
