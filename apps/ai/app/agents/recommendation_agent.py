from datetime import datetime
import time
import uuid
from typing import Any, Dict, Optional
from ..models.schemas import (
    RecommendationItem,
    RiskLevel,
    AgentRunItem,
    AgentRunStatus,
)


class RecommendationAgent:
    """Specialized agent responsible for formulating safe, approval-gated operational recommendations."""

    async def run(
        self,
        investigation_id: str,
        root_cause: Optional[str],
        confidence: Optional[float],
        raw_recommendation: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        started_at = datetime.utcnow()
        t0 = time.time()
        agent_name = "RecommendationAgent"

        try:
            raw = raw_recommendation or {}
            action = raw.get("action", f"Investigate and remediate root cause: {root_cause or 'system issue'}")
            reason = raw.get("reason", f"Addresses identified root cause ({root_cause or 'degraded service'})")

            # Validate risk level
            risk_str = str(raw.get("riskLevel", "HIGH")).upper()
            risk_level = RiskLevel.HIGH
            if risk_str in RiskLevel.__members__:
                risk_level = RiskLevel[risk_str]

            rec_confidence = float(raw.get("confidence", confidence or 0.85))
            steps = raw.get("mitigationSteps", [
                "Review telemetry in monitoring dashboards",
                "Apply corrective configuration or resource scaling",
                "Verify error rates normalize post-change",
            ])

            recommendation = RecommendationItem(
                id=f"rec-{uuid.uuid4().hex[:8]}",
                investigationId=investigation_id,
                action=action,
                reason=reason,
                riskLevel=risk_level,
                confidence=rec_confidence,
                requiresApproval=True,  # Safety guardrail: mandatory human approval
                mitigationSteps=steps,
                remediationExecuted=False,  # V2 safeguard: NO automated remediation execution
            )

            duration_ms = int((time.time() - t0) * 1000)
            agent_run = AgentRunItem(
                agent=agent_name,
                status=AgentRunStatus.COMPLETED,
                startedAt=started_at,
                completedAt=datetime.utcnow(),
                durationMs=duration_ms,
                inputSummary=f"root_cause='{root_cause}', confidence={confidence}",
                outputSummary=f"Action: '{action}' (Risk: {risk_level.value}, ApprovalRequired: True, Executed: False)",
                metadata={"riskLevel": risk_level.value, "requiresApproval": True},
            )

            return {"recommendation": recommendation, "run": agent_run}
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
            return {"recommendation": None, "run": agent_run, "error": str(e)}
