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

@Entity('user_notifications')
@Index('idx_user_notifications_user_read', ['userId', 'isRead', 'createdAt'])
@Index('idx_user_notifications_type', ['type'])
export class UserNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['comment_reply', 'like', 'system', 'announcement', 'favorite'],
    default: 'system',
  })
  type: 'comment_reply' | 'like' | 'system' | 'announcement' | 'favorite';

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'related_id', type: 'char', length: 36, nullable: true })
  relatedId: string | null;

  @Column({ name: 'related_type', type: 'varchar', length: 50, nullable: true })
  relatedType: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
