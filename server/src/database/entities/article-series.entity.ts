import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('article_series')
@Index('idx_article_series_slug', ['slug'], { unique: true })
export class ArticleSeries {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string | null;

  @Column({ type: 'enum', enum: ['draft', 'published'], default: 'draft' })
  status: 'draft' | 'published';

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'fk_article_series_created_by' })
  creator!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}