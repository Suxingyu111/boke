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

@Entity('pages')
@Index('idx_pages_slug', ['slug'], { unique: true })
@Index('idx_pages_type_status', ['pageType', 'status'])
@Index('idx_pages_nav_status', ['isHomeVisible', 'status'])
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({
    name: 'page_type',
    type: 'enum',
    enum: ['about', 'custom', 'resume', 'portfolio'],
    default: 'custom',
  })
  pageType: 'about' | 'custom' | 'resume' | 'portfolio';

  @Column({ name: 'content_markdown', type: 'longtext' })
  content: string;

  @Column({ name: 'content_html', type: 'longtext', nullable: true })
  contentHtml: string | null;

  @Column({ name: 'summary', type: 'varchar', length: 500, nullable: true })
  summary: string | null;

  @Column({ name: 'is_home_visible', type: 'boolean', default: false })
  isHomeVisible: boolean;

  @Column({ type: 'enum', enum: ['draft', 'published'], default: 'draft' })
  status: 'draft' | 'published';

  @Column({ name: 'seo_title', type: 'varchar', length: 255, nullable: true })
  seoTitle: string | null;

  @Column({ name: 'seo_description', type: 'varchar', length: 500, nullable: true })
  seoDescription: string | null;

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36 })
  createdBy: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'fk_pages_created_by' })
  creator!: User;

  @Column({ name: 'updated_by', type: 'varchar', length: 36, nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by', foreignKeyConstraintName: 'fk_pages_updated_by' })
  updater!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
