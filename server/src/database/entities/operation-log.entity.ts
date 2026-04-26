import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('operation_logs')
@Index('idx_operation_logs_operator', ['operatorId'])
@Index('idx_operation_logs_module_action', ['moduleName', 'actionName'])
@Index('idx_operation_logs_created_at', ['createdAt'])
export class OperationLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'operator_id', type: 'varchar', length: 36, nullable: true })
  operatorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operator_id', foreignKeyConstraintName: 'fk_operation_logs_operator' })
  operator!: User | null;

  @Column({ name: 'module_name', type: 'varchar', length: 50 })
  moduleName: string;

  @Column({ name: 'action_name', type: 'varchar', length: 50 })
  actionName: string;

  @Column({ name: 'target_type', type: 'varchar', length: 50, nullable: true })
  targetType: string | null;

  @Column({ name: 'target_id', type: 'varchar', length: 50, nullable: true })
  targetId: string | null;

  @Column({ name: 'request_method', type: 'varchar', length: 10, nullable: true })
  requestMethod: string | null;

  @Column({ name: 'request_path', type: 'varchar', length: 255, nullable: true })
  requestPath: string | null;

  @Column({ name: 'request_payload', type: 'json', nullable: true })
  requestPayload: Record<string, unknown> | null;

  @Column({ name: 'response_code', type: 'int', nullable: true })
  responseCode: number | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}