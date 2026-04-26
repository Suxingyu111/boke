import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('guestbook')
@Index('idx_guestbook_status_created', ['status', 'createdAt'])
export class Guestbook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nickname: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'parent_id', type: 'varchar', length: 36, nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ name: 'is_admin_reply', type: 'boolean', default: false })
  isAdminReply: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
