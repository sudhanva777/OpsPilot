export type InvestigationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type EvidenceType =
  | 'LOG'
  | 'HEALTH'
  | 'DATABASE'
  | 'METRIC'
  | 'DEPLOYMENT'
  | 'CONFIGURATION';

export type HypothesisStatus = 'PROPOSED' | 'SUPPORTED' | 'REJECTED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface InvestigationEvidence {
  id: string;
  investigationId: string;
  type: EvidenceType;
  source: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  collectedAt: string;
  createdAt: string;
}

export interface InvestigationHypothesis {
  id: string;
  investigationId: string;
  description: string;
  confidence: number;
  status: HypothesisStatus;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  reasoning: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationRecommendation {
  id: string;
  investigationId: string;
  action: string;
  reason: string;
  riskLevel: RiskLevel;
  confidence: number;
  requiresApproval: boolean;
  mitigationSteps: string[];
  remediationExecuted: boolean;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  investigationId: string;
  agent: string;
  status: AgentRunStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  inputSummary: string | null;
  outputSummary: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Investigation {
  id: string;
  incidentId: string;
  status: InvestigationStatus;
  startedAt: string;
  completedAt: string | null;
  summary: string | null;
  rootCause: string | null;
  confidence: number | null;
  confidenceFactors: string[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
  evidence?: InvestigationEvidence[];
  hypotheses?: InvestigationHypothesis[];
  recommendation?: InvestigationRecommendation | null;
  agentRuns?: AgentRun[];
}
