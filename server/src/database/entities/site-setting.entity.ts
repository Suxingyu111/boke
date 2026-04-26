import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('site_settings')
@Index('idx_site_settings_key', ['settingKey'], { unique: true })
@Index('idx_site_settings_group', ['groupName'])
export class SiteSetting {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'setting_key', type: 'varchar', length: 100 })
  settingKey: string;

  @Column({ name: 'setting_value', type: 'json' })
  settingValue: unknown;

  @Column({
    name: 'value_type',
    type: 'enum',
    enum: ['string', 'number', 'boolean', 'json'],
    default: 'string',
  })
  valueType: 'string' | 'number' | 'boolean' | 'json';

  @Column({ name: 'group_name', type: 'varchar', length: 50, default: 'general' })
  groupName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
