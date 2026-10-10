import type { Relation } from 'typeorm';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Investigation } from './investigation.entity.js';
import { EvidenceType } from '../../common/types/enums.js';

@Entity('investigation_evidence')
export class InvestigationEvidence {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  id!: string;

  @Column({ name: 'investigation_id', type: 'uuid' })
  investigationId!: string;

  @ManyToOne(() => Investigation, (inv) => inv.evidence, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'investigation_id' })
  investigation!: Relation<Investigation>;

  @Column({
    type: 'enum',
    enum: EvidenceType,
  })
  type!: EvidenceType;

  @Column({ type: 'varchar', length: 255 })
  source!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @Column({ name: 'collected_at', type: 'timestamp with time zone' })
  collectedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
