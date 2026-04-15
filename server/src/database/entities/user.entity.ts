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
@Index('idx_username', ['username'], { unique: true })
@Index('idx_users_role_status', ['role', 'isActive'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

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
    default: 'admin',
  })
  role: 'super_admin' | 'admin' | 'author' | 'user';

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
