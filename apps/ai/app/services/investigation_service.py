from datetime import datetime
import logging
import uuid
from typing import Dict, List, Optional

from ..models.schemas import (
    IncidentContext,
    InvestigationResponse,
    InvestigationStatus,
    EvidenceItem,
    HypothesisItem,
    RecommendationItem,
    AgentRunItem,
)
from ..models.state import InvestigationGraphState
from ..tools.investigation_tools import ControlledInvestigationTools
from ..services.llm_service import LLMService
from ..graph.nodes import GraphNodeContext
from ..graph.builder import build_investigation_graph

logger = logging.getLogger("InvestigationService")


class InvestigationService:
    """Manages execution, state lifecycle, and query retrieval of AI investigations."""

    def __init__(
        self,
        tools: Optional[ControlledInvestigationTools] = None,
        llm_service: Optional[LLMService] = None,
    ):
        self.tools = tools or ControlledInvestigationTools()
        self.llm = llm_service or LLMService()
        self.node_context = GraphNodeContext(self.tools, self.llm)
        self.graph = build_investigation_graph(self.node_context)

        # In-memory store for fast state access & execution tracking
        self._investigations: Dict[str, InvestigationResponse] = {}

    async def execute_investigation(
        self,
        incident_id: str,
        incident: IncidentContext,
        investigation_id: Optional[str] = None,
    ) -> InvestigationResponse:
        inv_id = investigation_id or f"inv-{uuid.uuid4().hex[:12]}"
        started_at = datetime.utcnow()

        logger.info(f"Starting investigation {inv_id} for incident {incident_id}: '{incident.title}'")

        initial_state: InvestigationGraphState = {
            "investigationId": inv_id,
            "incidentId": incident_id,
            "incident": incident,
            "plan": [],
            "status": InvestigationStatus.PENDING,
            "errors": [],
            "evidence": [],
            "findings": [],
            "agentResults": [],
            "hypotheses": [],
            "rootCause": None,
            "confidence": None,
            "confidenceFactors": [],
            "recommendation": None,
            "summary": None,
        }

        # Initialize pending record
        record = InvestigationResponse(
            id=inv_id,
            incidentId=incident_id,
            status=InvestigationStatus.RUNNING,
            startedAt=started_at,
        )
        self._investigations[inv_id] = record

        try:
            # Execute compiled LangGraph workflow
            final_state = await self.graph.ainvoke(initial_state)

            completed_at = datetime.utcnow()
            errors = final_state.get("errors", [])
            status = InvestigationStatus.FAILED if errors else InvestigationStatus.COMPLETED

            record = InvestigationResponse(
                id=inv_id,
                incidentId=incident_id,
                status=status,
                summary=final_state.get("summary"),
                rootCause=final_state.get("rootCause"),
                confidence=final_state.get("confidence"),
                confidenceFactors=final_state.get("confidenceFactors", []),
                error="; ".join(errors) if errors else None,
                startedAt=started_at,
                completedAt=completed_at,
                evidence=final_state.get("evidence", []),
                hypotheses=final_state.get("hypotheses", []),
                recommendation=final_state.get("recommendation"),
                agentRuns=final_state.get("agentResults", []),
            )
            self._investigations[inv_id] = record
            logger.info(f"Investigation {inv_id} finished: {record.status} (RCA: {record.rootCause})")
            return record

        except Exception as e:
            logger.exception(f"Investigation execution failed: {e}")
            record = InvestigationResponse(
                id=inv_id,
                incidentId=incident_id,
                status=InvestigationStatus.FAILED,
                error=str(e),
                startedAt=started_at,
                completedAt=datetime.utcnow(),
            )
            self._investigations[inv_id] = record
            return record

    def get_investigation(self, investigation_id: str) -> Optional[InvestigationResponse]:
        return self._investigations.get(investigation_id)

    def get_evidence(self, investigation_id: str) -> List[EvidenceItem]:
        inv = self._investigations.get(investigation_id)
        return inv.evidence if inv else []

    def get_hypotheses(self, investigation_id: str) -> List[HypothesisItem]:
        inv = self._investigations.get(investigation_id)
        return inv.hypotheses if inv else []

    def get_recommendation(self, investigation_id: str) -> Optional[RecommendationItem]:
        inv = self._investigations.get(investigation_id)
        return inv.recommendation if inv else None

    def get_runs(self, investigation_id: str) -> List[AgentRunItem]:
        inv = self._investigations.get(investigation_id)
        return inv.agentRuns if inv else []
