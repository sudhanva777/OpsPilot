from datetime import datetime
import time
import uuid
from typing import Any, Dict, Optional
from ..models.schemas import EvidenceItem, EvidenceType, AgentRunItem, AgentRunStatus
from ..tools.investigation_tools import ControlledInvestigationTools


class MetricsAgent:
    """Specialized agent responsible for inspecting latency, error rates, and resource utilization."""

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
        agent_name = "MetricsAgent"

        try:
            result = await self.tools.get_service_metrics(
                service=service or "service",
                timeframe="1h",
                context=context,
            )
            data = result.get("data", {})
            err_rate = data.get("error_rate", 0.0)
            p99 = data.get("latency_p99_ms", 0)
            p50 = data.get("latency_p50_ms", 0)
            rps = data.get("request_rate_rps", 0)
            cpu = data.get("cpu_utilization", 0.0)
            mem = data.get("memory_utilization", 0.0)
            summary = data.get("summary", "Metrics analysis complete")

            content_lines = [
                f"HTTP 5xx Error Rate: {int(err_rate * 100)}%",
                f"Latency: P50={p50}ms, P99={p99}ms",
                f"Throughput: {rps} req/sec",
                f"Host Resources: CPU={int(cpu * 100)}%, Memory={int(mem * 100)}%",
                f"Operational Summary: {summary}",
            ]

            evidence = EvidenceItem(
                id=f"ev-metric-{uuid.uuid4().hex[:8]}",
                investigationId=investigation_id,
                type=EvidenceType.METRIC,
                source=f"metrics:{service or 'default'}",
                title=f"Service Telemetry & Performance Metrics ({service or 'service'})",
                content="\n".join(content_lines),
                metadata={
                    "error_rate": err_rate,
                    "latency_p99_ms": p99,
                    "latency_p50_ms": p50,
                    "rps": rps,
                    "cpu_utilization": cpu,
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
                inputSummary=f"service={service}, timeframe=1h",
                outputSummary=f"5xx rate: {int(err_rate * 100)}%, P99: {p99}ms, RPS: {rps}",
                metadata={"error_rate": err_rate, "latency_p99_ms": p99},
            )

            return {
                "evidence": [evidence],
                "finding": {
                    "source": agent_name,
                    "summary": f"5xx Error Rate at {int(err_rate * 100)}%. P99 Latency: {p99}ms.",
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
