import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('friend_links')
@Index('idx_friend_links_status_sort', ['status', 'sortOrder'])
export class FriendLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_name', type: 'varchar', length: 100 })
  siteName: string;

  @Column({ name: 'site_url', type: 'varchar', length: 255 })
  siteUrl: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ name: 'applicant_name', type: 'varchar', length: 100, nullable: true })
  applicantName: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'offline'],
    default: 'approved',
  })
  status: 'pending' | 'approved' | 'rejected' | 'offline';

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
