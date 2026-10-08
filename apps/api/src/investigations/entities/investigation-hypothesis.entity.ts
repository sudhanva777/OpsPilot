import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Investigation } from './investigation.entity.js';
import { HypothesisStatus } from '../../common/types/enums.js';

@Entity('investigation_hypotheses')
export class InvestigationHypothesis {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  id!: string;

  @Column({ name: 'investigation_id', type: 'uuid' })
  investigationId!: string;

  @ManyToOne(() => Investigation, (inv) => inv.hypotheses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'investigation_id' })
  investigation!: Investigation;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'float' })
  confidence!: number;

  @Column({
    type: 'enum',
    enum: HypothesisStatus,
  })
  status!: HypothesisStatus;

  @Column({ name: 'supporting_evidence_ids', type: 'jsonb', default: () => "'[]'" })
  supportingEvidenceIds!: string[];

  @Column({ name: 'contradicting_evidence_ids', type: 'jsonb', default: () => "'[]'" })
  contradictingEvidenceIds!: string[];

  @Column({ type: 'text' })
  reasoning!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
