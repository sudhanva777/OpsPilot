from datetime import datetime
import time
import uuid
from typing import Any, Dict, List, Optional
from ..models.schemas import EvidenceItem, EvidenceType, AgentRunItem, AgentRunStatus
from ..tools.investigation_tools import ControlledInvestigationTools


class ConfigurationAgent:
    """Specialized agent responsible for inspecting configuration settings and recent changes."""

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
        agent_name = "ConfigurationAgent"

        try:
            result = await self.tools.get_configuration(
                service=service or "service",
                context=context,
            )
            data = result.get("data", {})
            current_config: Dict[str, Any] = data.get("current", {})
            recent_changes: List[Dict[str, Any]] = data.get("recent_changes", [])
            summary = data.get("summary", "Configuration check completed")

            content_lines = [
                f"Configuration Status for {service or 'service'}:",
                f"Summary: {summary}",
            ]
            if recent_changes:
                content_lines.append("Recent Changes Detected:")
                for chg in recent_changes:
                    content_lines.append(
                        f"  • [{chg.get('changed_at')}] {chg.get('key')}: "
                        f"'{chg.get('old_value')}' → '{chg.get('new_value')}' by {chg.get('changed_by')}"
                    )
            else:
                content_lines.append("No configuration changes recorded in the audit window.")

            evidence = EvidenceItem(
                id=f"ev-cfg-{uuid.uuid4().hex[:8]}",
                investigationId=investigation_id,
                type=EvidenceType.CONFIGURATION,
                source=f"configuration:{service or 'default'}",
                title=f"Configuration Audit ({service or 'service'})",
                content="\n".join(content_lines),
                metadata={
                    "changes_count": len(recent_changes),
                    "active_keys": list(current_config.keys()),
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
                outputSummary=f"{len(recent_changes)} changes found. {summary}",
                metadata={"changes_count": len(recent_changes)},
            )

            return {
                "evidence": [evidence],
                "finding": {
                    "source": agent_name,
                    "summary": f"{len(recent_changes)} config changes detected.",
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
