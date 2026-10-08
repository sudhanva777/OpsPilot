import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Investigation } from './investigation.entity.js';
import { RiskLevel } from '../../common/types/enums.js';

@Entity('investigation_recommendations')
export class InvestigationRecommendation {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  id!: string;

  @Column({ name: 'investigation_id', type: 'uuid', unique: true })
  investigationId!: string;

  @OneToOne(() => Investigation, (inv) => inv.recommendation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'investigation_id' })
  investigation!: Investigation;

  @Column({ type: 'text' })
  action!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: RiskLevel,
  })
  riskLevel!: RiskLevel;

  @Column({ type: 'float' })
  confidence!: number;

  @Column({ name: 'requires_approval', type: 'boolean', default: true })
  requiresApproval!: boolean;

  @Column({ name: 'mitigation_steps', type: 'jsonb', default: () => "'[]'" })
  mitigationSteps!: string[];

  @Column({ name: 'remediation_executed', type: 'boolean', default: false })
  remediationExecuted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
