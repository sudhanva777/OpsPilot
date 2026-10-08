import operator
from typing import Annotated, Any, Dict, List, Optional
from typing_extensions import TypedDict

from .schemas import (
    IncidentContext,
    EvidenceItem,
    HypothesisItem,
    RecommendationItem,
    AgentRunItem,
    InvestigationStatus,
)


class InvestigationGraphState(TypedDict, total=False):
    """Strongly typed state carried through the LangGraph investigation workflow."""

    # Identifiers & Context
    investigationId: str
    incidentId: str
    incident: IncidentContext

    # Plan & Execution State
    plan: List[str]
    status: InvestigationStatus
    errors: Annotated[List[str], operator.add]

    # Evidence, Findings & Run Tracking
    evidence: Annotated[List[EvidenceItem], operator.add]
    findings: Annotated[List[Dict[str, Any]], operator.add]
    agentResults: Annotated[List[AgentRunItem], operator.add]

    # Reasoning, RCA & Recommendation
    hypotheses: List[HypothesisItem]
    rootCause: Optional[str]
    confidence: Optional[float]
    confidenceFactors: List[str]
    recommendation: Optional[RecommendationItem]
    summary: Optional[str]
