import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('visitor_logs')
@Index('idx_visitor_logs_date', ['visitDate'])
@Index('idx_visitor_logs_ip_date', ['ip', 'visitDate'])
@Index('idx_visitor_logs_path', ['path'])
export class VisitorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 45 })
  ip: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referer: string | null;

  @Column({ type: 'varchar', length: 500 })
  path: string;

  @Column({ name: 'visit_date', type: 'date' })
  visitDate: string;

  @Column({ name: 'stay_duration', type: 'int', default: 0 })
  stayDuration: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  device: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  browser: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  os: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
