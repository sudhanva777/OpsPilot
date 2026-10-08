from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InvestigationStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class EvidenceType(str, Enum):
    LOG = "LOG"
    HEALTH = "HEALTH"
    DATABASE = "DATABASE"
    METRIC = "METRIC"
    DEPLOYMENT = "DEPLOYMENT"
    CONFIGURATION = "CONFIGURATION"


class HypothesisStatus(str, Enum):
    PROPOSED = "PROPOSED"
    SUPPORTED = "SUPPORTED"
    REJECTED = "REJECTED"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AgentRunStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# ─── Incident Context ────────────────────────────────────────────────────────

class IncidentContext(BaseModel):
    id: str
    projectId: str
    title: str
    description: Optional[str] = None
    service: Optional[str] = None
    severity: str = "HIGH"
    status: str = "OPEN"
    createdAt: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    symptoms: List[str] = Field(default_factory=list)


# ─── Evidence ────────────────────────────────────────────────────────────────

class EvidenceItem(BaseModel):
    id: str
    investigationId: str
    type: EvidenceType
    source: str
    title: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    collectedAt: datetime = Field(default_factory=datetime.utcnow)


# ─── Hypothesis ──────────────────────────────────────────────────────────────

class HypothesisItem(BaseModel):
    id: str
    investigationId: str
    description: str
    confidence: float = Field(ge=0.0, le=1.0)
    status: HypothesisStatus
    supportingEvidenceIds: List[str] = Field(default_factory=list)
    contradictingEvidenceIds: List[str] = Field(default_factory=list)
    reasoning: str


# ─── Recommendation ──────────────────────────────────────────────────────────

class RecommendationItem(BaseModel):
    id: str
    investigationId: str
    action: str
    reason: str
    riskLevel: RiskLevel
    confidence: float = Field(ge=0.0, le=1.0)
    requiresApproval: bool = True
    mitigationSteps: List[str] = Field(default_factory=list)
    remediationExecuted: bool = False


# ─── Agent Run Tracking ──────────────────────────────────────────────────────

class AgentRunItem(BaseModel):
    agent: str
    status: AgentRunStatus
    startedAt: datetime
    completedAt: Optional[datetime] = None
    durationMs: Optional[int] = None
    inputSummary: Optional[str] = None
    outputSummary: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ─── Investigation Aggregate / Responses ─────────────────────────────────────

class StartInvestigationRequest(BaseModel):
    incidentId: str
    incident: IncidentContext
    investigationId: Optional[str] = None
    options: Dict[str, Any] = Field(default_factory=dict)


class InvestigationResponse(BaseModel):
    id: str
    incidentId: str
    status: InvestigationStatus
    summary: Optional[str] = None
    rootCause: Optional[str] = None
    confidence: Optional[float] = None
    confidenceFactors: List[str] = Field(default_factory=list)
    error: Optional[str] = None
    startedAt: datetime
    completedAt: Optional[datetime] = None
    evidence: List[EvidenceItem] = Field(default_factory=list)
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    hypotheses: List[HypothesisItem] = Field(default_factory=list)
    recommendation: Optional[RecommendationItem] = None
    agentRuns: List[AgentRunItem] = Field(default_factory=list)


class InvestigationListResponse(BaseModel):
    investigations: List[InvestigationResponse]
