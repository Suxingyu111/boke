import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('categories')
@Index('idx_categories_slug', ['slug'], { unique: true })
@Index('idx_categories_visible_sort', ['isVisible', 'sortOrder'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'article_count', type: 'int', default: 0 })
  articleCount: number;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'varchar', length: 20, default: '#000000' })
  color: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
