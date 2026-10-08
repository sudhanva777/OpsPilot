from datetime import datetime
import logging
import time
from typing import Any, Dict, List

from ..models.schemas import (
    InvestigationStatus,
    AgentRunItem,
    AgentRunStatus,
)
from ..models.state import InvestigationGraphState
from ..tools.investigation_tools import ControlledInvestigationTools
from ..services.llm_service import LLMService
from ..agents.log_agent import LogAgent
from ..agents.health_agent import HealthAgent
from ..agents.database_agent import DatabaseAgent
from ..agents.metrics_agent import MetricsAgent
from ..agents.deployment_agent import DeploymentAgent
from ..agents.config_agent import ConfigurationAgent
from ..agents.rca_agent import RcaAgent
from ..agents.recommendation_agent import RecommendationAgent

logger = logging.getLogger("GraphNodes")


class GraphNodeContext:
    """Encapsulates toolset, LLM service, and specialized agent singletons."""

    def __init__(
        self,
        tools: ControlledInvestigationTools,
        llm_service: LLMService,
    ):
        self.tools = tools
        self.llm = llm_service
        self.log_agent = LogAgent(tools)
        self.health_agent = HealthAgent(tools)
        self.database_agent = DatabaseAgent(tools)
        self.metrics_agent = MetricsAgent(tools)
        self.deployment_agent = DeploymentAgent(tools)
        self.config_agent = ConfigurationAgent(tools)
        self.rca_agent = RcaAgent(llm_service)
        self.recommendation_agent = RecommendationAgent()


# ─── Node Implementations ───────────────────────────────────────────────────

def create_load_incident_node(ctx: GraphNodeContext):
    async def load_incident(state: InvestigationGraphState) -> Dict[str, Any]:
        logger.info(f"Loading incident: {state.get('incidentId')}")
        return {
            "status": InvestigationStatus.RUNNING,
        }
    return load_incident


def create_plan_investigation_node(ctx: GraphNodeContext):
    async def plan_investigation(state: InvestigationGraphState) -> Dict[str, Any]:
        incident = state.get("incident")
        plan = [
            "collect_logs",
            "collect_health",
            "collect_database",
            "collect_metrics",
            "collect_deployment",
            "collect_configuration",
        ]
        logger.info(f"Planned investigation for '{incident.title}': {len(plan)} collection domains")
        orchestrator_run = AgentRunItem(
            agent="InvestigationOrchestrator",
            status=AgentRunStatus.COMPLETED,
            startedAt=datetime.utcnow(),
            completedAt=datetime.utcnow(),
            durationMs=15,
            inputSummary=f"Incident '{incident.title}' (sev: {incident.severity})",
            outputSummary=f"Created parallel plan covering {len(plan)} telemetry domains",
        )
        return {
            "plan": plan,
            "agentResults": [orchestrator_run],
        }
    return plan_investigation


def create_collect_logs_node(ctx: GraphNodeContext):
    async def collect_logs(state: InvestigationGraphState) -> Dict[str, Any]:
        incident = state.get("incident")
        res = await ctx.log_agent.run(
            investigation_id=state.get("investigationId"),
            service=incident.service or "service",
            context={"title": incident.title, "description": incident.description, "service": incident.service},
        )
        updates: Dict[str, Any] = {
            "evidence": res.get("evidence", []),
            "agentResults": [res.get("run")] if res.get("run") else [],
        }
        if res.get("finding"):
            updates["findings"] = [res["finding"]]
        return updates
    return collect_logs


def create_collect_health_node(ctx: GraphNodeContext):
    async def collect_health(state: InvestigationGraphState) -> Dict[str, Any]:
        incident = state.get("incident")
        res = await ctx.health_agent.run(
            investigation_id=state.get("investigationId"),
            service=incident.service or "service",
            context={"title": incident.title, "description": incident.description, "service": incident.service},
        )
        updates: Dict[str, Any] = {
            "evidence": res.get("evidence", []),
            "agentResults": [res.get("run")] if res.get("run") else [],
        }
        if res.get("finding"):
            updates["findings"] = [res["finding"]]
        return updates
    return collect_health


def create_collect_database_node(ctx: GraphNodeContext):
    async def collect_database(state: InvestigationGraphState) -> Dict[str, Any]:
        incident = state.get("incident")
        res = await ctx.database_agent.run(
            investigation_id=state.get("investigationId"),
            context={"title": incident.title, "description": incident.description, "service": incident.service},
        )
        updates: Dict[str, Any] = {
            "evidence": res.get("evidence", []),
            "agentResults": [res.get("run")] if res.get("run") else [],
        }
        if res.get("finding"):
            updates["findings"] = [res["finding"]]
        return updates
    return collect_database


def create_collect_metrics_node(ctx: GraphNodeContext):
    async def collect_metrics(state: InvestigationGraphState) -> Dict[str, Any]:
        incident = state.get("incident")
        res = await ctx.metrics_agent.run(
            investigation_id=state.get("investigationId"),
            service=incident.service or "service",
            context={"title": incident.title, "description": incident.description, "service": incident.service},
        )
        updates: Dict[str, Any] = {
            "evidence": res.get("evidence", []),
            "agentResults": [res.get("run")] if res.get("run") else [],
        }
        if res.get("finding"):
            updates["findings"] = [res["finding"]]
        return updates
    return collect_metrics


def create_collect_deployment_node(ctx: GraphNodeContext):
    async def collect_deployment(state: InvestigationGraphState) -> Dict[str, Any]:
        incident = state.get("incident")
        res = await ctx.deployment_agent.run(
            investigation_id=state.get("investigationId"),
            service=incident.service or "service",
            context={"title": incident.title, "description": incident.description, "service": incident.service},
        )
        updates: Dict[str, Any] = {
            "evidence": res.get("evidence", []),
            "agentResults": [res.get("run")] if res.get("run") else [],
        }
        if res.get("finding"):
            updates["findings"] = [res["finding"]]
        return updates
    return collect_deployment


def create_collect_configuration_node(ctx: GraphNodeContext):
    async def collect_configuration(state: InvestigationGraphState) -> Dict[str, Any]:
        incident = state.get("incident")
        res = await ctx.config_agent.run(
            investigation_id=state.get("investigationId"),
            service=incident.service or "service",
            context={"title": incident.title, "description": incident.description, "service": incident.service},
        )
        updates: Dict[str, Any] = {
            "evidence": res.get("evidence", []),
            "agentResults": [res.get("run")] if res.get("run") else [],
        }
        if res.get("finding"):
            updates["findings"] = [res["finding"]]
        return updates
    return collect_configuration


def create_analyze_evidence_node(ctx: GraphNodeContext):
    async def analyze_evidence(state: InvestigationGraphState) -> Dict[str, Any]:
        evidence = state.get("evidence", [])
        logger.info(f"Analyzing {len(evidence)} evidence records")
        return {}
    return analyze_evidence


def create_evaluate_hypotheses_node(ctx: GraphNodeContext):
    async def evaluate_hypotheses(state: InvestigationGraphState) -> Dict[str, Any]:
        incident = state.get("incident")
        evidence = state.get("evidence", [])

        res = await ctx.rca_agent.run(
            investigation_id=state.get("investigationId"),
            incident_title=incident.title,
            incident_description=incident.description,
            service=incident.service,
            evidence_list=evidence,
        )

        return {
            "hypotheses": res.get("hypotheses", []),
            "rootCause": res.get("rootCause"),
            "confidence": res.get("confidence"),
            "confidenceFactors": res.get("confidenceFactors", []),
            "summary": res.get("summary"),
            "_raw_rec": res.get("raw_recommendation"),
            "agentResults": [res.get("run")] if res.get("run") else [],
        }
    return evaluate_hypotheses


def create_generate_recommendation_node(ctx: GraphNodeContext):
    async def generate_recommendation(state: InvestigationGraphState) -> Dict[str, Any]:
        raw_rec = state.get("_raw_rec")
        res = await ctx.recommendation_agent.run(
            investigation_id=state.get("investigationId"),
            root_cause=state.get("rootCause"),
            confidence=state.get("confidence"),
            raw_recommendation=raw_rec,
        )
        return {
            "recommendation": res.get("recommendation"),
            "agentResults": [res.get("run")] if res.get("run") else [],
        }
    return generate_recommendation


def create_validate_result_node(ctx: GraphNodeContext):
    async def validate_result(state: InvestigationGraphState) -> Dict[str, Any]:
        root_cause = state.get("rootCause")
        confidence = state.get("confidence")
        rec = state.get("recommendation")

        if not root_cause:
            return {"errors": ["Validation failure: Root cause was not determined."]}

        if confidence is None or not (0.0 <= confidence <= 1.0):
            return {"errors": ["Validation failure: Confidence score must be between 0.0 and 1.0."]}

        if not rec or rec.remediationExecuted:
            return {"errors": ["Validation failure: Remediation execution must remain disabled."]}

        return {}
    return validate_result


def create_finalize_investigation_node(ctx: GraphNodeContext):
    async def finalize_investigation(state: InvestigationGraphState) -> Dict[str, Any]:
        errors = state.get("errors", [])
        final_status = InvestigationStatus.FAILED if errors else InvestigationStatus.COMPLETED
        logger.info(f"Finalized investigation with status: {final_status}")
        return {
            "status": final_status,
        }
    return finalize_investigation
