import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Incident } from './incident.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { IncidentEventType } from '../../common/types/enums.js';

/**
 * IncidentEvent entity — immutable timeline record.
 *
 * Every significant action on an incident produces an event.
 * Events are never mutated or deleted; they form an audit trail.
 *
 * The metadata JSONB column stores structured context about each event:
 * - STATUS_CHANGED: { from, to }
 * - SEVERITY_CHANGED: { from, to }
 * - ASSIGNEE_CHANGED: { fromId, toId }
 * - COMMENT_ADDED: { body }
 *
 * V2 will extend this table with:
 * - INVESTIGATION_STARTED
 * - TOOL_CALLED
 * - ROOT_CAUSE_IDENTIFIED
 * - RECOMMENDATION_GENERATED
 */
@Entity('incident_events')
@Index(['incidentId', 'createdAt'])
export class IncidentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'incident_id' })
  incidentId: string;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true, default: null })
  actorId: string | null;

  @Column({
    type: 'enum',
    enum: IncidentEventType,
    name: 'event_type',
  })
  eventType: IncidentEventType;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Incident, (incident) => incident.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;
}
