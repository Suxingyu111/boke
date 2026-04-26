import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { UserRoleCode } from '../default-user-roles';

@Entity('user_roles')
@Index('idx_user_roles_name', ['name'], { unique: true })
export class UserRoleEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  code: UserRoleCode;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_system', type: 'boolean', default: true })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
