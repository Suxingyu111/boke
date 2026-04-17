import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('email_subscribers')
@Index('idx_subscriber_email', ['email'], { unique: true })
export class EmailSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Column({ name: 'is_confirmed', type: 'boolean', default: false })
  isConfirmed: boolean;

  @Column({ name: 'confirm_token', type: 'varchar', length: 100, nullable: true })
  confirmToken: string | null;

  @Column({ name: 'unsubscribe_token', type: 'varchar', length: 100, unique: true })
  unsubscribeToken: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'subscribed_at', type: 'datetime' })
  subscribedAt: Date;

  @Column({ name: 'confirmed_at', type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'unsubscribed_at', type: 'datetime', nullable: true })
  unsubscribedAt: Date | null;
}
