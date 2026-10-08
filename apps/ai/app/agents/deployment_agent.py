from datetime import datetime
import time
import uuid
from typing import Any, Dict, List, Optional
from ..models.schemas import EvidenceItem, EvidenceType, AgentRunItem, AgentRunStatus
from ..tools.investigation_tools import ControlledInvestigationTools


class DeploymentAgent:
    """Specialized agent responsible for inspecting recent deployments and correlating with incident onset."""

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
        agent_name = "DeploymentAgent"

        try:
            result = await self.tools.get_recent_deployments(
                service=service or "service",
                limit=5,
                context=context,
            )
            deployments: List[Dict[str, Any]] = result.get("data", [])

            content_lines = [f"Recent Deployments for {service or 'service'}:"]
            if not deployments:
                content_lines.append("  No deployments recorded in the audit log window.")
            for dep in deployments:
                content_lines.append(
                    f"  • {dep.get('version')} deployed at {dep.get('deployed_at')} "
                    f"by {dep.get('deployed_by', 'system')} (commit: {dep.get('commit', 'n/a')}) "
                    f"- {dep.get('message', 'No commit message')}"
                )

            evidence = EvidenceItem(
                id=f"ev-dep-{uuid.uuid4().hex[:8]}",
                investigationId=investigation_id,
                type=EvidenceType.DEPLOYMENT,
                source=f"deployment-history:{service or 'default'}",
                title=f"Deployment History ({service or 'service'})",
                content="\n".join(content_lines),
                metadata={
                    "deployment_count": len(deployments),
                    "latest_version": deployments[0].get("version") if deployments else None,
                    "latest_deployed_at": deployments[0].get("deployed_at") if deployments else None,
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
                inputSummary=f"service={service}, limit=5",
                outputSummary=f"Found {len(deployments)} deployments. Latest: {deployments[0].get('version') if deployments else 'none'}",
                metadata={"deployments_found": len(deployments)},
            )

            return {
                "evidence": [evidence],
                "finding": {
                    "source": agent_name,
                    "summary": f"{len(deployments)} deployments checked. Latest: {deployments[0].get('version') if deployments else 'None'}",
                    "details": content_lines[1] if len(content_lines) > 1 else "",
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
