import type { Relation } from 'typeorm';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Incident } from '../../incidents/entities/incident.entity.js';
import { InvestigationEvidence } from './investigation-evidence.entity.js';
import { InvestigationHypothesis } from './investigation-hypothesis.entity.js';
import { InvestigationRecommendation } from './investigation-recommendation.entity.js';
import { AgentRun } from './agent-run.entity.js';
import { InvestigationStatus } from '../../common/types/enums.js';

@Entity('investigations')
export class Investigation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'incident_id', type: 'uuid' })
  incidentId!: string;

  @ManyToOne(() => Incident, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident!: Relation<Incident>;

  @Column({
    type: 'enum',
    enum: InvestigationStatus,
    default: InvestigationStatus.PENDING,
  })
  status!: InvestigationStatus;

  @Column({ name: 'started_at', type: 'timestamp with time zone' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause!: string | null;

  @Column({ type: 'float', nullable: true })
  confidence!: number | null;

  @Column({ name: 'confidence_factors', type: 'jsonb', default: () => "'[]'" })
  confidenceFactors!: string[];

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @OneToMany(() => InvestigationEvidence, (e) => e.investigation, {
    cascade: true,
  })
  evidence!: Relation<InvestigationEvidence[]>;

  @OneToMany(() => InvestigationHypothesis, (h) => h.investigation, {
    cascade: true,
  })
  hypotheses!: Relation<InvestigationHypothesis[]>;

  @OneToOne(() => InvestigationRecommendation, (r) => r.investigation, {
    cascade: true,
  })
  recommendation?: Relation<InvestigationRecommendation | null>;

  @OneToMany(() => AgentRun, (r) => r.investigation, {
    cascade: true,
  })
  agentRuns!: Relation<AgentRun[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
