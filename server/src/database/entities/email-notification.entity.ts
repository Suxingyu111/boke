import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('email_notifications')
@Index('idx_email_notif_status', ['status'])
@Index('idx_email_notif_type', ['type'])
export class EmailNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'to_email', type: 'varchar', length: 255 })
  toEmail: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'longtext' })
  body: string;

  @Column({
    type: 'enum',
    enum: ['comment', 'subscription', 'system'],
    default: 'system',
  })
  type: 'comment' | 'subscription' | 'system';

  @Column({
    type: 'enum',
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'sent' | 'failed';

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
