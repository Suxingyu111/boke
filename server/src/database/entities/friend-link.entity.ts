import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('friend_links')
export class FriendLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_name', length: 100 })
  siteName: string;

  @Column({ name: 'site_url', length: 255 })
  siteUrl: string;

  @Column({ name: 'logo_url', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'contact_email', length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ name: 'applicant_name', length: 100, nullable: true })
  applicantName: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'offline'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected' | 'offline';

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
