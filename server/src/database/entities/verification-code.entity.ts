import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('verification_codes')
@Index('idx_verification_codes_target', ['targetType', 'targetValue', 'purpose'])
@Index('idx_verification_codes_expires_at', ['expiresAt'])
export class VerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_type', type: 'enum', enum: ['email', 'phone'] })
  targetType: 'email' | 'phone';

  @Column({ name: 'target_value', type: 'varchar', length: 255 })
  targetValue: string;

  @Column({ type: 'enum', enum: ['registration'], default: 'registration' })
  purpose: 'registration';

  @Column({ name: 'code_hash', type: 'varchar', length: 255 })
  codeHash: string;

  @Column({ name: 'send_count', type: 'int', default: 1 })
  sendCount: number;

  @Column({ name: 'verify_attempts', type: 'int', default: 0 })
  verifyAttempts: number;

  @Column({ name: 'max_attempts', type: 'int', default: 5 })
  maxAttempts: number;

  @Column({ name: 'last_sent_at', type: 'datetime' })
  lastSentAt: Date;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'consumed_at', type: 'datetime', nullable: true })
  consumedAt: Date | null;

  @Column({ name: 'request_ip', type: 'varchar', length: 45, nullable: true })
  requestIp: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
