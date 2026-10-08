from datetime import datetime
import time
import uuid
from typing import Any, Dict, Optional
from ..models.schemas import EvidenceItem, EvidenceType, AgentRunItem, AgentRunStatus
from ..tools.investigation_tools import ControlledInvestigationTools


class DatabaseAgent:
    """Specialized agent responsible for inspecting database connection pools and queries."""

    def __init__(self, tools: ControlledInvestigationTools):
        self.tools = tools

    async def run(
        self,
        investigation_id: str,
        database_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        started_at = datetime.utcnow()
        t0 = time.time()
        agent_name = "DatabaseAgent"

        try:
            result = await self.tools.get_database_health(
                database_name=database_name,
                context=context,
            )
            data = result.get("data", {})
            status = data.get("status", "unknown")
            active_conn = data.get("active_connections", 0)
            max_conn = data.get("max_connections", 0)
            pool_util = data.get("pool_utilization", 0.0)
            waiting_queries = data.get("waiting_queries", 0)
            summary = data.get("summary", "Database inspection completed")

            content_lines = [
                f"Database Status: {status.upper()}",
                f"Active Connections: {active_conn} / {max_conn} (Pool Utilization: {int(pool_util * 100)}%)",
                f"Waiting Queries in Queue: {waiting_queries}",
                f"Slow Queries Recorded: {data.get('slow_queries_count', 0)}",
                f"Deadlocks: {data.get('deadlocks', 0)}",
                f"Telemetry Summary: {summary}",
            ]
            if "top_slow_query" in data:
                content_lines.append(f"Top Slow Query: {data['top_slow_query']}")

            evidence = EvidenceItem(
                id=f"ev-db-{uuid.uuid4().hex[:8]}",
                investigationId=investigation_id,
                type=EvidenceType.DATABASE,
                source=f"database:{data.get('database_name', 'primary')}",
                title=f"Database Pool & Query Health ({data.get('database_name', 'primary')})",
                content="\n".join(content_lines),
                metadata={
                    "status": status,
                    "pool_utilization": pool_util,
                    "active_connections": active_conn,
                    "max_connections": max_conn,
                    "waiting_queries": waiting_queries,
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
                inputSummary=f"database={database_name or 'primary'}",
                outputSummary=f"Status: {status}. Pool utilization: {int(pool_util * 100)}%. Waiting queries: {waiting_queries}",
                metadata={"pool_utilization": pool_util},
            )

            return {
                "evidence": [evidence],
                "finding": {
                    "source": agent_name,
                    "summary": f"Database status: {status}. Connection pool at {int(pool_util * 100)}%.",
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
