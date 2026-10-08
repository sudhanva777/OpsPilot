import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Project } from '../../projects/entities/project.entity.js';
import { IncidentEvent } from './incident-event.entity.js';
import { IncidentSeverity, IncidentStatus } from '../../common/types/enums.js';

/**
 * Incident entity — the central V1 domain object.
 *
 * Status transitions are enforced by IncidentsService.validateTransition().
 * This entity does not enforce the state machine; it stores the result.
 *
 * V2 will add foreign keys here for:
 * - investigations (investigation_id)
 * - remediations
 * - postmortems
 * without requiring structural changes to this entity.
 */
@Entity('incidents')
@Index(['projectId', 'status'])
@Index(['projectId', 'severity'])
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  service: string | null;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
    default: IncidentSeverity.MEDIUM,
  })
  severity: IncidentSeverity;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.OPEN,
  })
  status: IncidentStatus;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById: string;

  @Column({ type: 'uuid', name: 'assigned_to_id', nullable: true, default: null })
  assignedToId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true, default: null })
  resolvedAt: Date | null;

  // V2 extension point: investigation_id, remediation_id, postmortem_id
  // can be added here as nullable FKs without changing existing columns.

  // Relations
  @ManyToOne(() => Project, (project) => project.incidents)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, (user) => user.createdIncidents, { eager: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @ManyToOne(() => User, (user) => user.assignedIncidents, {
    eager: false,
    nullable: true,
  })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User | null;

  @OneToMany(() => IncidentEvent, (event) => event.incident, { cascade: true })
  events: IncidentEvent[];
}
