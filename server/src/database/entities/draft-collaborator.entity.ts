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

@Entity('draft_collaborators')
@Index('idx_draft_collab_article_user', ['articleId', 'userId'], { unique: true })
@Index('idx_draft_collaborators_user_id', ['userId'])
@Index('idx_draft_collaborators_invited_by', ['invitedBy'])
export class DraftCollaborator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_id', type: 'varchar', length: 36 })
  articleId: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id', foreignKeyConstraintName: 'fk_draft_collaborators_article' })
  article!: Article;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_draft_collaborators_user' })
  user!: User;

  @Column({
    type: 'enum',
    enum: ['editor', 'viewer'],
    default: 'editor',
  })
  permission: 'editor' | 'viewer';

  @Column({ name: 'invited_by', type: 'varchar', length: 36 })
  invitedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invited_by', foreignKeyConstraintName: 'fk_draft_collaborators_invited_by' })
  inviter!: User;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
