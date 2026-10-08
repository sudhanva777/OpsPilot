import pytest
from app.models.schemas import IncidentContext, InvestigationStatus, RiskLevel
from app.services.investigation_service import InvestigationService


@pytest.mark.asyncio
async def test_langgraph_investigation_payment_scenario():
    service = InvestigationService()
    incident = IncidentContext(
        id="inc-test-payment-101",
        projectId="proj-1",
        title="Payment requests returning HTTP 500",
        description="Checkout flow failing with 500 internal server errors. Database timeouts reported.",
        service="payment-service",
        severity="CRITICAL",
        status="OPEN",
    )

    result = await service.execute_investigation(
        incident_id=incident.id,
        incident=incident,
    )

    assert result.status == InvestigationStatus.COMPLETED
    assert result.rootCause is not None
    # Must identify database connection pool exhaustion
    assert "connection pool exhaustion" in result.rootCause.lower()
    assert result.confidence is not None
    assert result.confidence >= 0.85
    assert len(result.confidenceFactors) >= 2

    # Evidence verification: all 6 domains collected
    assert len(result.evidence) >= 6
    evidence_types = {e.type.value for e in result.evidence}
    assert "LOG" in evidence_types
    assert "HEALTH" in evidence_types
    assert "DATABASE" in evidence_types
    assert "METRIC" in evidence_types
    assert "DEPLOYMENT" in evidence_types
    assert "CONFIGURATION" in evidence_types

    # Hypotheses verification
    assert len(result.hypotheses) >= 3
    supported_hyps = [h for h in result.hypotheses if h.status.value == "SUPPORTED"]
    assert len(supported_hyps) == 1
    assert "database" in supported_hyps[0].description.lower()

    # Rejected hypotheses verification
    rejected_hyps = [h for h in result.hypotheses if h.status.value == "REJECTED"]
    assert len(rejected_hyps) >= 2

    # Recommendation verification
    assert result.recommendation is not None
    assert "database" in result.recommendation.action.lower() or "pool" in result.recommendation.action.lower()
    assert result.recommendation.riskLevel in (RiskLevel.HIGH, RiskLevel.MEDIUM)
    assert result.recommendation.requiresApproval is True
    assert result.recommendation.remediationExecuted is False  # Zero-compromise safeguard

    # Agent runs verification
    agent_names = {r.agent for r in result.agentRuns}
    assert "InvestigationOrchestrator" in agent_names
    assert "LogAgent" in agent_names
    assert "HealthAgent" in agent_names
    assert "DatabaseAgent" in agent_names
    assert "MetricsAgent" in agent_names
    assert "DeploymentAgent" in agent_names
    assert "ConfigurationAgent" in agent_names
    assert "RcaAgent" in agent_names
    assert "RecommendationAgent" in agent_names


@pytest.mark.asyncio
async def test_langgraph_investigation_bad_deployment_scenario():
    service = InvestigationService()
    incident = IncidentContext(
        id="inc-test-deploy-102",
        projectId="proj-1",
        title="Errors spike immediately following release v2.4.1",
        description="Crash in billing address parsing on checkout service",
        service="checkout-service",
        severity="HIGH",
        status="OPEN",
    )

    result = await service.execute_investigation(
        incident_id=incident.id,
        incident=incident,
    )

    assert result.status == InvestigationStatus.COMPLETED
    assert result.rootCause is not None
    assert "deployment" in result.rootCause.lower() or "regression" in result.rootCause.lower()
    assert result.recommendation.remediationExecuted is False


@pytest.mark.asyncio
async def test_langgraph_investigation_high_latency_scenario():
    service = InvestigationService()
    incident = IncidentContext(
        id="inc-test-latency-103",
        projectId="proj-1",
        title="Elevated latency and slow database queries on orders",
        description="P99 latency surged above 9 seconds. Unindexed sequential scan.",
        service="order-service",
        severity="HIGH",
        status="OPEN",
    )

    result = await service.execute_investigation(
        incident_id=incident.id,
        incident=incident,
    )

    assert result.status == InvestigationStatus.COMPLETED
    assert result.rootCause is not None
    assert "query" in result.rootCause.lower() or "latency" in result.rootCause.lower() or "performance" in result.rootCause.lower()
    assert result.recommendation.remediationExecuted is False


@pytest.mark.asyncio
async def test_langgraph_investigation_auth_config_scenario():
    service = InvestigationService()
    incident = IncidentContext(
        id="inc-test-auth-104",
        projectId="proj-1",
        title="API Gateway 401 Unauthorized errors after config update",
        description="JWT audience mismatch rejecting client tokens",
        service="api-gateway",
        severity="HIGH",
        status="OPEN",
    )

    result = await service.execute_investigation(
        incident_id=incident.id,
        incident=incident,
    )

    assert result.status == InvestigationStatus.COMPLETED
    assert result.rootCause is not None
    assert "auth" in result.rootCause.lower() or "configuration" in result.rootCause.lower()
    assert result.recommendation.remediationExecuted is False

