import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Investigation } from './investigation.entity.js';
import { AgentRunStatus } from '../../common/types/enums.js';

@Entity('agent_runs')
export class AgentRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'investigation_id', type: 'uuid' })
  investigationId!: string;

  @ManyToOne(() => Investigation, (inv) => inv.agentRuns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'investigation_id' })
  investigation!: Relation<Investigation>;

  @Column({ type: 'varchar', length: 128 })
  agent!: string;

  @Column({
    type: 'enum',
    enum: AgentRunStatus,
    default: AgentRunStatus.PENDING,
  })
  status!: AgentRunStatus;

  @Column({ name: 'started_at', type: 'timestamp with time zone' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs!: number | null;

  @Column({ name: 'input_summary', type: 'text', nullable: true })
  inputSummary!: string | null;

  @Column({ name: 'output_summary', type: 'text', nullable: true })
  outputSummary!: string | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
