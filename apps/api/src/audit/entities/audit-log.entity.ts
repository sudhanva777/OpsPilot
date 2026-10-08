import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AuditAction, AuditResourceType } from '../../common/types/enums.js';

/**
 * AuditLog entity — security and compliance trail.
 *
 * Records every security-sensitive or business-critical action.
 * Audit records are NEVER mutated or deleted.
 *
 * actorId is populated from the authenticated JWT — never from client input.
 * If an action is unauthenticated (e.g., failed login attempt), actorId is null.
 */
@Entity('audit_logs')
@Index(['actorId', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true, default: null })
  actorId: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResourceType,
    name: 'resource_type',
    nullable: true,
    default: null,
  })
  resourceType: AuditResourceType | null;

  @Column({ type: 'uuid', name: 'resource_id', nullable: true, default: null })
  resourceId: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true, default: null })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
