import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

const userStatusTransformer = {
  to(value: boolean): 'active' | 'disabled' {
    return value === false ? 'disabled' : 'active';
  },
  from(value: 'active' | 'disabled'): boolean {
    return value !== 'disabled';
  },
};

@Entity('users')
@Index('idx_email', ['email'], { unique: true })
@Index('idx_phone', ['phone'], { unique: true })
@Index('idx_username', ['username'], { unique: true })
@Index('idx_nickname', ['nickname'], { unique: true })
@Index('idx_users_role_status', ['role', 'isActive'])
@Index('idx_users_registration_type_status', ['registrationType', 'isActive'])
@Index('idx_users_oauth_provider', ['oauthProvider', 'oauthProviderId'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  nickname: string | null;

  @Column({
    name: 'registration_type',
    type: 'enum',
    enum: ['email', 'phone', 'oauth'],
    default: 'email',
  })
  registrationType: 'email' | 'phone' | 'oauth';

  @Column({ name: 'email_verified_at', type: 'datetime', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ name: 'phone_verified_at', type: 'datetime', nullable: true })
  phoneVerifiedAt: Date | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatar: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({
    name: 'oauth_provider',
    type: 'enum',
    enum: ['github', 'google'],
    nullable: true,
  })
  oauthProvider?: 'github' | 'google' | null;

  @Column({ name: 'oauth_provider_id', type: 'varchar', length: 120, nullable: true })
  oauthProviderId?: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['active', 'disabled'],
    default: 'active',
    transformer: userStatusTransformer,
  })
  isActive: boolean = true;

  @Column({
    type: 'enum',
    enum: ['super_admin', 'admin', 'author', 'user'],
    default: 'user',
  })
  role: 'super_admin' | 'admin' | 'author' | 'user';

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'password_changed_at', type: 'datetime', nullable: true })
  passwordChangedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
