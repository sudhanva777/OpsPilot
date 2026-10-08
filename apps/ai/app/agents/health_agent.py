from datetime import datetime
import time
import uuid
from typing import Any, Dict, Optional
from ..models.schemas import EvidenceItem, EvidenceType, AgentRunItem, AgentRunStatus
from ..tools.investigation_tools import ControlledInvestigationTools


class HealthAgent:
    """Specialized agent responsible for inspecting service and dependency health."""

    def __init__(self, tools: ControlledInvestigationTools):
        self.tools = tools

    async def run(
        self,
        investigation_id: str,
        service: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        started_at = datetime.utcnow()
        t0 = time.time()
        agent_name = "HealthAgent"

        try:
            result = await self.tools.get_service_health(service=service or "service", context=context)
            data = result.get("data", {})
            status = data.get("status", "unknown")
            summary = data.get("summary", "Health check completed")

            checks = data.get("checks", {})
            failing_checks = [k for k, v in checks.items() if v.get("status") in ("failing", "degraded")]

            content_lines = [f"Overall Service Status: {status.upper()}"]
            content_lines.append(f"Summary: {summary}")
            for k, v in checks.items():
                content_lines.append(f"  • {k}: {v.get('status')} {v.get('message', '')}")

            evidence = EvidenceItem(
                id=f"ev-health-{uuid.uuid4().hex[:8]}",
                investigationId=investigation_id,
                type=EvidenceType.HEALTH,
                source=f"health-checks:{service or 'default'}",
                title=f"Service Health & Dependencies for {service or 'service'}",
                content="\n".join(content_lines),
                metadata={
                    "status": status,
                    "failing_checks": failing_checks,
                    "healthy": data.get("healthy", False),
                },
                collectedAt=datetime.utcnow(),
            )

            duration_ms = int((time.time() - t0) * 1000)
            agent_run = AgentRunItem(
                agent=agent_name,
                status=AgentRunStatus.COMPLETED,
                startedAt=started_at,
                completedAt=datetime.utcnow(),
                durationMs=duration_ms,
                inputSummary=f"service={service}",
                outputSummary=f"Health status: {status}. Failing dependencies: {', '.join(failing_checks) or 'None'}",
                metadata={"status": status},
            )

            return {
                "evidence": [evidence],
                "finding": {
                    "source": agent_name,
                    "summary": f"Health status: {status}. {len(failing_checks)} degraded checks.",
                    "details": summary,
                },
                "run": agent_run,
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
            return {"evidence": [], "finding": None, "run": agent_run, "error": str(e)}
