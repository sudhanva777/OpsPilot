from datetime import datetime
import time
import uuid
from typing import Any, Dict, List, Optional
from ..models.schemas import (
    EvidenceItem,
    HypothesisItem,
    HypothesisStatus,
    AgentRunItem,
    AgentRunStatus,
)
from ..services.llm_service import LLMService


class RcaAgent:
    """Specialized agent responsible for synthesizing evidence, evaluating hypotheses, and determining RCA."""

    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    async def run(
        self,
        investigation_id: str,
        incident_title: str,
        incident_description: Optional[str],
        service: Optional[str],
        evidence_list: List[EvidenceItem],
    ) -> Dict[str, Any]:
        started_at = datetime.utcnow()
        t0 = time.time()
        agent_name = "RcaAgent"

        try:
            rca_result = await self.llm.analyze_and_formulate_rca(
                incident_title=incident_title,
                incident_description=incident_description,
                service=service,
                evidence_list=evidence_list,
            )

            # Map hypotheses into typed HypothesisItem objects
            hypotheses: List[HypothesisItem] = []
            for h in rca_result.get("hypotheses", []):
                hyp_status = (
                    HypothesisStatus.SUPPORTED
                    if str(h.get("status", "")).upper() == "SUPPORTED"
                    else HypothesisStatus.REJECTED
                )
                hypotheses.append(
                    HypothesisItem(
                        id=f"hyp-{uuid.uuid4().hex[:8]}",
                        investigationId=investigation_id,
                        description=h.get("description", "Unknown hypothesis"),
                        confidence=float(h.get("confidence", 0.5)),
                        status=hyp_status,
                        supportingEvidenceIds=h.get("supportingEvidenceIds", []),
                        contradictingEvidenceIds=h.get("contradictingEvidenceIds", []),
                        reasoning=h.get("reasoning", ""),
                    )
                )

            root_cause = rca_result.get("rootCause", "Undetermined root cause")
            confidence = float(rca_result.get("confidence", 0.85))
            confidence_factors = rca_result.get("confidenceFactors", [])
            summary = rca_result.get("summary", f"Root cause: {root_cause}")

            fallback_used = bool(rca_result.get("fallbackUsed", False))
            provider_name = rca_result.get("provider") or getattr(self.llm, "provider", "unknown")
            fallback_reason = rca_result.get("fallbackReason")

            duration_ms = int((time.time() - t0) * 1000)
            if fallback_used:
                output_summary = f"RCA [Fallback Engine]: {root_cause} (Confidence: {int(confidence * 100)}%)"
            else:
                output_summary = f"RCA [{provider_name.upper()} LLM]: {root_cause} (Confidence: {int(confidence * 100)}%)"

            agent_run = AgentRunItem(
                agent=agent_name,
                status=AgentRunStatus.COMPLETED,
                startedAt=started_at,
                completedAt=datetime.utcnow(),
                durationMs=duration_ms,
                inputSummary=f"Evaluated {len(evidence_list)} evidence records across 5 hypotheses",
                outputSummary=output_summary,
                metadata={
                    "confidence": confidence,
                    "rootCause": root_cause,
                    "provider": provider_name,
                    "fallbackUsed": fallback_used,
                    "fallbackReason": fallback_reason,
                },
            )

            return {
                "hypotheses": hypotheses,
                "rootCause": root_cause,
                "confidence": confidence,
                "confidenceFactors": confidence_factors,
                "summary": summary,
                "raw_recommendation": rca_result.get("recommendation"),
                "run": agent_run,
                "provider": provider_name,
                "fallbackUsed": fallback_used,
                "fallbackReason": fallback_reason,
            }
        except Exception as e:
            duration_ms = int((time.time() - t0) * 1000)
            agent_run = AgentRunItem(
                agent=agent_name,
                status=AgentRunStatus.FAILED,
                startedAt=started_at,
                completedAt=datetime.utcnow(),
                durationMs=duration_ms,
                error=str(e),
            )
            return {
                "hypotheses": [],
                "rootCause": None,
                "confidence": None,
                "confidenceFactors": [],
                "summary": None,
                "raw_recommendation": None,
                "run": agent_run,
                "error": str(e),
            }
