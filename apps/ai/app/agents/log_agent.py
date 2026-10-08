from datetime import datetime
import time
import uuid
from typing import Any, Dict, List, Optional
from ..models.schemas import EvidenceItem, EvidenceType, AgentRunItem, AgentRunStatus
from ..tools.investigation_tools import ControlledInvestigationTools


class LogAgent:
    """Specialized agent responsible for retrieving and analyzing service logs."""

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
        agent_name = "LogAgent"

        try:
            result = await self.tools.get_service_logs(
                service=service or "service",
                limit=50,
                context=context,
            )
            raw_logs: List[Dict[str, Any]] = result.get("data", [])
            error_count = sum(1 for l in raw_logs if l.get("level") in ("ERROR", "FATAL"))
            warn_count = sum(1 for l in raw_logs if l.get("level") == "WARN")

            # Formulate synthesized log evidence
            formatted_entries = []
            for l in raw_logs:
                formatted_entries.append(
                    f"[{l.get('timestamp')}] {l.get('level')} ({l.get('service')}): {l.get('message')}"
                )
            content_str = "\n".join(formatted_entries)

            evidence = EvidenceItem(
                id=f"ev-log-{uuid.uuid4().hex[:8]}",
                investigationId=investigation_id,
                type=EvidenceType.LOG,
                source=f"service-logs:{service or 'default'}",
                title=f"Application Logs for {service or 'service'}",
                content=content_str or "No error logs found.",
                metadata={
                    "total_entries": len(raw_logs),
                    "error_count": error_count,
                    "warn_count": warn_count,
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
                inputSummary=f"service={service}, limit=50",
                outputSummary=f"Analyzed {len(raw_logs)} log lines ({error_count} errors, {warn_count} warnings)",
                metadata={"error_count": error_count},
            )

            return {
                "evidence": [evidence],
                "finding": {
                    "source": agent_name,
                    "summary": f"{error_count} errors detected in {service} logs",
                    "details": content_str[:300],
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
