import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('email_subscribers')
@Index('idx_email_subscribers_email', ['email'], { unique: true })
@Index('idx_email_subscribers_unsubscribe_token', ['unsubscribeToken'], { unique: true })
@Index('idx_email_subscribers_confirm_token_hash', ['confirmTokenHash'])
@Index('idx_email_subscribers_is_active', ['isActive'])
@Index('idx_email_subscribers_is_confirmed', ['isConfirmed'])
export class EmailSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Column({ name: 'is_confirmed', type: 'boolean', default: false })
  isConfirmed: boolean;

  @Column({ name: 'confirm_token', type: 'varchar', length: 100, nullable: true })
  confirmToken: string | null;

  @Column({ name: 'confirm_token_hash', type: 'varchar', length: 64, nullable: true })
  confirmTokenHash: string | null;

  @Column({ name: 'unsubscribe_token', type: 'varchar', length: 100 })
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
