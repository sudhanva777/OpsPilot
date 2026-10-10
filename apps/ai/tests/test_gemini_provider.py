import json
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.config.settings import Settings
from app.models.schemas import (
    IncidentContext,
    InvestigationStatus,
    EvidenceItem,
    EvidenceType,
    RiskLevel,
)
from app.services.llm_service import LLMService
from app.services.investigation_service import InvestigationService
from app.tools.investigation_tools import ControlledInvestigationTools


# ─── 1. Provider Configuration & Selection Tests ─────────────────────────────

def test_settings_gemini_defaults():
    """Verify Gemini configuration defaults to Google AI Studio free tier model."""
    custom_settings = Settings(
        _env_file=None,
        ai_provider="gemini",
        gemini_api_key="test-gemini-key",
        gemini_model="gemini-2.5-flash",
    )
    assert custom_settings.resolved_ai_provider == "gemini"
    assert custom_settings.gemini_model == "gemini-2.5-flash"
    assert custom_settings.gemini_temperature == 0.1
    assert custom_settings.gemini_max_tokens == 4096


def test_provider_selection_resolution():
    """Verify provider selection switch respects AI_PROVIDER and key auto-detection."""
    # Explicit gemini
    s1 = Settings(_env_file=None, ai_provider="gemini", gemini_api_key="key1", groq_api_key="key2")
    assert s1.resolved_ai_provider == "gemini"

    # Explicit groq
    s2 = Settings(_env_file=None, ai_provider="groq", gemini_api_key="key1", groq_api_key="key2")
    assert s2.resolved_ai_provider == "groq"

    # Case-insensitivity & whitespace trimming
    s3 = Settings(_env_file=None, ai_provider="  GEMINI  ")
    assert s3.resolved_ai_provider == "gemini"

    s4 = Settings(_env_file=None, ai_provider=" Groq ")
    assert s4.resolved_ai_provider == "groq"

    # Auto-detection when AI_PROVIDER is not explicitly specified:
    # Only Groq key present -> groq
    s5 = Settings(_env_file=None, ai_provider=None, groq_api_key="real-groq-key", gemini_api_key=None)
    assert s5.resolved_ai_provider == "groq"

    # Only Gemini key present -> gemini
    s6 = Settings(_env_file=None, ai_provider=None, gemini_api_key="real-gemini-key", groq_api_key=None)
    assert s6.resolved_ai_provider == "gemini"


def test_health_endpoint_reports_provider_status_without_leaking_keys():
    """Verify /health endpoint reports provider status and booleans without exposing raw keys."""
    from starlette.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert data["service"] == "opspilot-ai"
    assert "ai_provider" in data
    assert data["ai_provider"] in ("gemini", "groq")
    assert isinstance(data["gemini_configured"], bool)
    assert isinstance(data["groq_configured"], bool)
    assert isinstance(data["provider_configured"], bool)

    # Security check: Ensure raw key strings are never exposed in response
    body_str = response.text
    assert "gsk_" not in body_str
    assert "AIza" not in body_str


# ─── 2. Gemini Reasoning & Response Compatibility Tests ───────────────────────

@pytest.mark.asyncio
async def test_gemini_successful_structured_reasoning():
    """Mock Gemini generate_content to verify structured schema parsing and compatibility."""
    llm = LLMService(provider="gemini", api_key="dummy_gemini_key", model="gemini-2.5-flash")

    mock_gemini_response = {
        "summary": "Root cause identified as downstream inventory service timeout causing order gateway 504.",
        "hypotheses": [
            {
                "description": "Downstream inventory-service latency spike exceeding 5000ms timeout",
                "status": "SUPPORTED",
                "confidence": 0.94,
                "supportingEvidenceIds": ["ev-1", "ev-2"],
                "contradictingEvidenceIds": [],
                "reasoning": "Logs corroborate HTTP 504 gateway timeout waiting for inventory-service.",
            },
            {
                "description": "Local container memory exhaustion",
                "status": "REJECTED",
                "confidence": 0.05,
                "supportingEvidenceIds": [],
                "contradictingEvidenceIds": ["ev-3"],
                "reasoning": "Container memory utilization was normal at 35%.",
            },
            {
                "description": "Recent deployment regression",
                "status": "REJECTED",
                "confidence": 0.02,
                "supportingEvidenceIds": [],
                "contradictingEvidenceIds": ["ev-4"],
                "reasoning": "No deployment occurred during the incident window.",
            },
        ],
        "rootCause": "Downstream inventory-service latency spike exceeding 5000ms timeout",
        "confidence": 0.94,
        "confidenceFactors": [
            "Log telemetry records downstream HTTP 504 gateway timeouts",
            "Gateway host CPU and memory remain healthy",
        ],
        "recommendation": {
            "action": "Engage inventory-service team and increase circuit-breaker fallback timeout",
            "reason": "Directly mitigates client request timeout cascades",
            "riskLevel": "MEDIUM",
            "confidence": 0.94,
            "mitigationSteps": [
                "Verify downstream inventory-service health and queue depth",
                "Temporarily enable circuit breaker cached response fallback",
            ],
        },
    }

    mock_response_obj = MagicMock()
    mock_response_obj.text = json.dumps(mock_gemini_response)

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response_obj)
    llm.client = mock_client

    ev1 = EvidenceItem(
        id="ev-1",
        investigationId="inv-1",
        title="Gateway 504 logs",
        type=EvidenceType.LOG,
        source="logs",
        content="Timeout calling downstream http://inventory-service:8080/stock",
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Orders failing with 504 Gateway Timeout",
        incident_description="Downstream timeout",
        service="order-service",
        evidence_list=[ev1],
    )

    assert result["fallbackUsed"] is False
    assert result["provider"] == "gemini"
    assert result["model"] == "gemini-2.5-flash"
    assert "inventory-service" in result["rootCause"].lower()
    assert result["confidence"] == 0.94
    assert len(result["hypotheses"]) == 3
    assert result["recommendation"]["riskLevel"] == "MEDIUM"


@pytest.mark.asyncio
async def test_gemini_markdown_wrapped_json_handling():
    """Verify robust handling when Gemini wraps response in markdown code blocks."""
    llm = LLMService(provider="gemini", api_key="dummy_gemini_key", model="gemini-2.5-flash")

    mock_gemini_response = {
        "summary": "Database connection pool exhausted.",
        "hypotheses": [
            {
                "description": "Database pool saturation",
                "status": "SUPPORTED",
                "confidence": 0.90,
                "supportingEvidenceIds": ["ev-db-1"],
                "contradictingEvidenceIds": [],
                "reasoning": "Pool utilization at 100%.",
            }
        ],
        "rootCause": "Database pool saturation",
        "confidence": 0.90,
        "confidenceFactors": ["Pool at 100%"],
        "recommendation": {
            "action": "Increase connection pool size",
            "reason": "Resolves pool exhaustion",
            "riskLevel": "HIGH",
            "confidence": 0.90,
            "mitigationSteps": ["Scale database pool connections"],
        },
    }

    # Wrap in markdown code fence
    markdown_text = f"```json\n{json.dumps(mock_gemini_response)}\n```"

    mock_response_obj = MagicMock()
    mock_response_obj.text = markdown_text

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response_obj)
    llm.client = mock_client

    ev_db = EvidenceItem(
        id="ev-db-1",
        investigationId="inv-1",
        title="DB Pool Saturation",
        type=EvidenceType.DATABASE,
        source="database",
        content="Database pool saturated",
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Database connection timeout",
        incident_description="Pool exhausted",
        service="payment-service",
        evidence_list=[ev_db],
    )

    assert result["fallbackUsed"] is False
    assert result["provider"] == "gemini"
    assert "database pool saturation" in result["rootCause"].lower()


# ─── 3. Gemini Error & Fallback Reasoning Tests ───────────────────────────────

@pytest.mark.asyncio
async def test_gemini_api_error_transparent_fallback():
    """When Gemini raises an API exception (e.g. quota, network), engine transparently

    falls back to algorithmic reasoning, clearly reporting fallback reasoning was used.
    """
    llm = LLMService(provider="gemini", api_key="dummy_key", model="gemini-2.5-flash")

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=RuntimeError("Google Gemini API error: Resource has been exhausted (quota limit)")
    )
    llm.client = mock_client

    ev_db = EvidenceItem(
        id="ev-1",
        investigationId="inv-1",
        title="Database Connection Pool Exhaustion",
        type=EvidenceType.DATABASE,
        source="simulated_database",
        content="Database connection pool utilization at 100% with 45 waiting queries",
        metadata={"pool_utilization": 1.0, "waiting_queries": 45},
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Payment service 500 error spike",
        incident_description="Database pool exhausted",
        service="payment-service",
        evidence_list=[ev_db],
    )

    # Verification: Engine did not crash
    assert "rootCause" in result
    assert "database" in result["rootCause"].lower()

    # Verification: Fallback is explicitly reported, NOT falsely claimed as LLM success
    assert result["fallbackUsed"] is True
    assert result["provider"] == "gemini"
    assert "fallbackReason" in result
    assert "Gemini API error" in result["fallbackReason"]
    assert any("fallback reasoning engine" in factor.lower() for factor in result["confidenceFactors"])


@pytest.mark.asyncio
async def test_gemini_missing_api_key_triggers_fallback():
    """When Gemini is selected but no API key is configured, fallback engine handles reasoning."""
    llm = LLMService(provider="gemini", api_key="", model="gemini-2.5-flash")
    assert llm.gemini_client is None

    ev_dep = EvidenceItem(
        id="ev-dep-1",
        investigationId="inv-2",
        title="Downstream Gateway Timeout",
        type=EvidenceType.LOG,
        source="simulated_log",
        content="calling http://inventory-service returned 504 gateway timeout",
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Checkout 504 Gateway Timeout",
        incident_description="Downstream timeout",
        service="checkout-service",
        evidence_list=[ev_dep],
    )

    assert result["fallbackUsed"] is True
    assert "missing" in result["fallbackReason"].lower() or "not configured" in result["fallbackReason"].lower()
    assert "inventory-service" in result["rootCause"].lower() or "downstream" in result["rootCause"].lower()


def test_gemini_explicit_empty_key_ignores_environment():
    """An explicitly empty or blank API key must not create a Gemini client,

    even if GEMINI_API_KEY exists in the process environment.
    """
    with patch.dict(os.environ, {"GEMINI_API_KEY": "env-configured-secret-key"}):
        # Explicit empty string
        llm_empty = LLMService(provider="gemini", api_key="", model="gemini-2.5-flash")
        assert llm_empty.gemini_client is None
        assert llm_empty.api_key == ""

        # Explicit whitespace string
        llm_spaces = LLMService(provider="gemini", api_key="   ", model="gemini-2.5-flash")
        assert llm_spaces.gemini_client is None

        # Explicit placeholder string
        llm_placeholder = LLMService(provider="gemini", api_key="your_gemini_api_key_here", model="gemini-2.5-flash")
        assert llm_placeholder.gemini_client is None


def test_gemini_valid_key_initializes_client():
    """Verify that providing a valid key initializes the Gemini client."""
    llm = LLMService(provider="gemini", api_key="test-valid-api-key", model="gemini-2.5-flash")
    assert llm.gemini_client is not None
    assert llm.provider == "gemini"


def test_groq_explicit_empty_key_ignores_environment():
    """An explicitly empty or blank API key must not create a Groq client,

    even if GROQ_API_KEY exists in the process environment.
    """
    with patch.dict(os.environ, {"GROQ_API_KEY": "env-configured-groq-key"}):
        llm_empty = LLMService(provider="groq", api_key="", model="llama-3.3-70b-versatile")
        assert llm_empty.groq_client is None
        assert llm_empty.api_key == ""


@pytest.mark.asyncio
async def test_groq_api_error_transparent_fallback():
    """Verify Groq provider also transparently falls back when it encounters an error."""
    llm = LLMService(provider="groq", api_key="dummy_key", model="llama-3.3-70b-versatile")

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=ConnectionResetError("Groq server connection reset")
    )
    llm.client = mock_client

    ev_db = EvidenceItem(
        id="ev-1",
        investigationId="inv-3",
        title="Database pool saturated",
        type=EvidenceType.DATABASE,
        source="simulated_database",
        content="Database pool saturated at 100%",
        metadata={"pool_utilization": 1.0, "waiting_queries": 30},
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Payment 500 errors",
        incident_description="Database pool saturated",
        service="payment-service",
        evidence_list=[ev_db],
    )

    assert result["fallbackUsed"] is True
    assert result["provider"] == "groq"
    assert "Groq API error" in result["fallbackReason"]


# ─── 4. End-to-End LangGraph Workflow Integration with Gemini ─────────────────

@pytest.mark.asyncio
async def test_langgraph_workflow_with_gemini_success():
    """Verify full LangGraph workflow execution using Gemini provider with mocked API."""
    mock_gemini_response = {
        "summary": "Database pool exhaustion isolated as root cause.",
        "hypotheses": [
            {
                "description": "Database connection pool exhaustion starving request handlers",
                "status": "SUPPORTED",
                "confidence": 0.92,
                "supportingEvidenceIds": ["ev-1"],
                "contradictingEvidenceIds": [],
                "reasoning": "Database pool telemetry confirms 100% capacity.",
            },
            {
                "description": "Application memory exhaustion",
                "status": "REJECTED",
                "confidence": 0.10,
                "supportingEvidenceIds": [],
                "contradictingEvidenceIds": ["ev-2"],
                "reasoning": "Memory metrics remain nominal.",
            },
            {
                "description": "Network partition",
                "status": "REJECTED",
                "confidence": 0.05,
                "supportingEvidenceIds": [],
                "contradictingEvidenceIds": ["ev-3"],
                "reasoning": "Health checks respond successfully.",
            },
        ],
        "rootCause": "Database connection pool exhaustion starving request handlers",
        "confidence": 0.92,
        "confidenceFactors": ["Database pool saturated at 100%"],
        "recommendation": {
            "action": "Increase database connection pool max connections to 100",
            "reason": "Directly prevents connection starvation",
            "riskLevel": "HIGH",
            "confidence": 0.92,
            "mitigationSteps": ["Apply database pool configuration update", "Monitor connection metrics"],
        },
    }

    mock_response_obj = MagicMock()
    mock_response_obj.text = json.dumps(mock_gemini_response)

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response_obj)

    gemini_llm = LLMService(provider="gemini", api_key="dummy_key", model="gemini-2.5-flash")
    gemini_llm.client = mock_client

    inv_service = InvestigationService(llm_service=gemini_llm)

    incident = IncidentContext(
        id="inc-gemini-test-01",
        projectId="proj-gemini",
        title="Payment requests returning HTTP 500",
        description="Database connection pool exhausted",
        service="payment-service",
        severity="CRITICAL",
        status="OPEN",
    )

    result = await inv_service.execute_investigation(
        incident_id=incident.id,
        incident=incident,
    )

    assert result.status == InvestigationStatus.COMPLETED
    assert result.aiProvider == "gemini"
    assert result.fallbackUsed is False
    assert result.fallbackReason is None
    assert "connection pool exhaustion" in result.rootCause.lower()
    assert result.confidence == 0.92

    # Verification: Evidence from all 6 domains collected
    assert len(result.evidence) >= 6

    # Verification: Safety guardrails strictly enforced
    assert result.recommendation is not None
    assert result.recommendation.requiresApproval is True
    assert result.recommendation.remediationExecuted is False


@pytest.mark.asyncio
async def test_langgraph_workflow_with_gemini_error_fallback():
    """Verify full LangGraph workflow execution falls back and reports fallback when Gemini fails."""
    gemini_llm = LLMService(provider="gemini", api_key="dummy_key", model="gemini-2.5-flash")

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=TimeoutError("Gemini request timed out after 30s")
    )
    gemini_llm.client = mock_client

    inv_service = InvestigationService(llm_service=gemini_llm)

    incident = IncidentContext(
        id="inc-gemini-test-02",
        projectId="proj-gemini",
        title="Payment requests returning HTTP 500",
        description="Database connection pool exhausted",
        service="payment-service",
        severity="CRITICAL",
        status="OPEN",
    )

    result = await inv_service.execute_investigation(
        incident_id=incident.id,
        incident=incident,
    )

    assert result.status == InvestigationStatus.COMPLETED
    assert result.aiProvider == "gemini"
    assert result.fallbackUsed is True
    assert "Gemini API error" in (result.fallbackReason or "")
    assert "connection pool exhaustion" in result.rootCause.lower()

    # Verify RcaAgent run item reports Fallback Engine
    rca_runs = [r for r in result.agentRuns if r.agent == "RcaAgent"]
    assert len(rca_runs) == 1
    assert "Fallback Engine" in rca_runs[0].outputSummary
    assert rca_runs[0].metadata.get("fallbackUsed") is True

    # Verification: Safety guardrails strictly enforced
    assert result.recommendation.requiresApproval is True
    assert result.recommendation.remediationExecuted is False


# ─── 5. Safety Constraint Verification ────────────────────────────────────────

def test_controlled_tools_prohibit_shell_and_arbitrary_execution():
    """Verify ControlledInvestigationTools only exposes bounded telemetry queries and no shell execution."""
    tools = ControlledInvestigationTools()
    exposed_methods = [
        func for func in dir(tools)
        if callable(getattr(tools, func)) and not func.startswith("_")
    ]

    expected_methods = {
        "get_service_logs",
        "get_service_health",
        "get_database_health",
        "get_service_metrics",
        "get_recent_deployments",
        "get_configuration",
    }
    assert set(exposed_methods) == expected_methods

    # Ensure no dangerous execution capabilities exist
    assert not hasattr(tools, "execute_command")
    assert not hasattr(tools, "exec_shell")
    assert not hasattr(tools, "run_remediation")


# ─── 6. Latency Optimization, AFC, Retries & State Lifecycle Tests ───────────

def test_settings_gemini_latency_and_retry_defaults():
    """Verify default and overridden timeout, retry, and thinking budget configurations."""
    s = Settings(
        _env_file=None,
        gemini_timeout=45.0,
        gemini_max_retries=3,
        gemini_retry_delay=0.5,
        gemini_thinking_budget=0,
    )
    assert s.gemini_timeout == 45.0
    assert s.gemini_max_retries == 3
    assert s.gemini_retry_delay == 0.5
    assert s.gemini_thinking_budget == 0


@pytest.mark.asyncio
async def test_gemini_afc_disabled_and_thinking_budget_in_config():
    """Verify that GenerateContentConfig explicitly disables AFC and bounds thinking budget."""
    captured_config = []

    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "summary": "Root cause identified.",
        "hypotheses": [
            {
                "description": "Cache eviction storm",
                "status": "SUPPORTED",
                "confidence": 0.95,
                "supportingEvidenceIds": ["ev-1"],
                "contradictingEvidenceIds": [],
                "reasoning": "Memory pressure caused massive key evictions.",
            }
        ],
        "rootCause": "Cache eviction storm",
        "confidence": 0.95,
        "confidenceFactors": ["Cache hit ratio dropped to 10%"],
        "recommendation": {
            "action": "Increase Redis memory limit",
            "reason": "Avoids eviction cascades",
            "riskLevel": "LOW",
            "confidence": 0.95,
            "mitigationSteps": ["Scale cache instance"],
        },
    })

    async def mock_generate_content(*args, **kwargs):
        cfg = kwargs.get("config")
        captured_config.append(cfg)
        return mock_response

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=mock_generate_content)

    llm = LLMService(
        provider="gemini",
        api_key="dummy_key",
        model="gemini-2.5-flash",
        timeout=10.0,
        thinking_budget=0,
    )
    llm.client = mock_client

    ev = EvidenceItem(
        id="ev-1",
        investigationId="inv-afc-1",
        title="Cache hit drop",
        type=EvidenceType.METRIC,
        source="metrics",
        content="Cache hit ratio dropped to 10%",
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Redis latency spike",
        incident_description="Cache evictions",
        service="cache-service",
        evidence_list=[ev],
    )

    assert result["fallbackUsed"] is False
    assert len(captured_config) == 1
    cfg = captured_config[0]
    assert cfg is not None
    # AFC must be explicitly disabled to eliminate SDK overhead and remote tool loops
    assert cfg.automatic_function_calling is not None
    assert cfg.automatic_function_calling.disable is True
    # Thinking budget must be set to 0 to prevent unbounded dynamic thinking token latency
    assert cfg.thinking_config is not None
    assert cfg.thinking_config.thinking_budget == 0


@pytest.mark.asyncio
async def test_gemini_request_timeout_triggers_bounded_fallback():
    """Verify that a request timeout immediately falls back to algorithmic reasoning without hanging."""
    import asyncio

    llm = LLMService(
        provider="gemini",
        api_key="dummy_key",
        model="gemini-2.5-flash",
        timeout=0.05,  # 50ms bounded timeout for test
        max_retries=0,  # 0 retries
    )

    async def slow_gemini_call(*args, **kwargs):
        await asyncio.sleep(0.5)  # Sleep longer than the 50ms timeout
        return MagicMock(text="{}")

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=slow_gemini_call)
    llm.client = mock_client

    ev = EvidenceItem(
        id="ev-db-1",
        investigationId="inv-timeout-1",
        title="Database pool exhausted",
        type=EvidenceType.DATABASE,
        source="database",
        content="Database pool saturated at 100%",
        metadata={"pool_utilization": 1.0, "waiting_queries": 50},
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Payment failure 500",
        incident_description="DB pool issue",
        service="payment-service",
        evidence_list=[ev],
    )

    # Must transparently fall back, not hang indefinitely or crash
    assert result["fallbackUsed"] is True
    assert result["provider"] == "gemini"
    assert "timed out" in result["fallbackReason"].lower()
    assert "connection pool exhaustion" in result["rootCause"].lower()


@pytest.mark.asyncio
async def test_gemini_bounded_retries_eventual_success():
    """Verify that transient failures retry with backoff and succeed if a later attempt passes."""
    call_count = 0

    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "summary": "Resolved via retry.",
        "hypotheses": [
            {
                "description": "Network blip",
                "status": "SUPPORTED",
                "confidence": 0.90,
                "supportingEvidenceIds": ["ev-1"],
                "contradictingEvidenceIds": [],
                "reasoning": "Transient packet drop.",
            }
        ],
        "rootCause": "Network blip",
        "confidence": 0.90,
        "confidenceFactors": ["Corroborated by metrics"],
        "recommendation": {
            "action": "Monitor network interfaces",
            "reason": "Checks error counters",
            "riskLevel": "LOW",
            "confidence": 0.90,
            "mitigationSteps": ["Verify NIC telemetry"],
        },
    })

    async def transient_failure_then_success(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise ConnectionError("Transient reset by peer")
        return mock_response

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=transient_failure_then_success)

    llm = LLMService(
        provider="gemini",
        api_key="dummy_key",
        model="gemini-2.5-flash",
        timeout=5.0,
        max_retries=2,
        retry_delay=0.01,  # Fast 10ms delay for test
    )
    llm.client = mock_client

    ev = EvidenceItem(
        id="ev-1",
        investigationId="inv-retry-1",
        title="NIC drop",
        type=EvidenceType.METRIC,
        source="metrics",
        content="NIC drop count elevated",
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Network blip",
        incident_description="Packet loss",
        service="gateway",
        evidence_list=[ev],
    )

    # Should succeed on attempt 2 without needing algorithmic fallback
    assert result["fallbackUsed"] is False
    assert call_count == 2
    assert result["rootCause"] == "Network blip"


@pytest.mark.asyncio
async def test_gemini_bounded_retries_exhaustion_triggers_fallback():
    """Verify that when all retries are exhausted, engine cleanly falls back to algorithmic engine."""
    call_count = 0

    async def always_failing(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        raise RuntimeError(f"Persistent upstream 503 Service Unavailable (attempt {call_count})")

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=always_failing)

    llm = LLMService(
        provider="gemini",
        api_key="dummy_key",
        model="gemini-2.5-flash",
        timeout=5.0,
        max_retries=2,
        retry_delay=0.01,
    )
    llm.client = mock_client

    ev = EvidenceItem(
        id="ev-1",
        investigationId="inv-exhaust-1",
        title="DB pool issue",
        type=EvidenceType.DATABASE,
        source="database",
        content="Database pool saturated at 100%",
        metadata={"pool_utilization": 1.0, "waiting_queries": 40},
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Database connection pool exhausted",
        incident_description="DB pool 100%",
        service="payment-service",
        evidence_list=[ev],
    )

    # Attempt 1 + 2 retries = exactly 3 calls
    assert call_count == 3
    assert result["fallbackUsed"] is True
    assert "Gemini API error" in result["fallbackReason"]
    assert "connection pool exhaustion" in result["rootCause"].lower()


@pytest.mark.asyncio
async def test_investigation_state_completed_on_gemini_timeout():
    """Verify full LangGraph investigation lifecycle reaches COMPLETED status even when Gemini times out."""
    import asyncio

    llm = LLMService(
        provider="gemini",
        api_key="dummy_key",
        model="gemini-2.5-flash",
        timeout=0.05,
        max_retries=0,
    )

    async def timeout_call(*args, **kwargs):
        await asyncio.sleep(0.3)
        return MagicMock(text="{}")

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=timeout_call)
    llm.client = mock_client

    inv_service = InvestigationService(llm_service=llm)

    incident = IncidentContext(
        id="inc-state-timeout-01",
        projectId="proj-state",
        title="Payment gateway timeout",
        description="Database pool saturation",
        service="payment-service",
        severity="CRITICAL",
        status="OPEN",
    )

    result = await inv_service.execute_investigation(
        incident_id=incident.id,
        incident=incident,
    )

    # State machine must reach COMPLETED reliably
    assert result.status == InvestigationStatus.COMPLETED
    assert result.aiProvider == "gemini"
    assert result.fallbackUsed is True
    assert "timed out" in (result.fallbackReason or "").lower()
    assert result.rootCause is not None
    assert result.recommendation is not None
    assert result.recommendation.requiresApproval is True
    assert result.recommendation.remediationExecuted is False


@pytest.mark.asyncio
async def test_investigation_state_failed_on_fatal_workflow_error():
    """Verify that when a fatal unhandled error occurs in the workflow, state transitions to FAILED."""
    inv_service = InvestigationService()

    # Force a fatal exception inside the graph execution
    inv_service.graph.ainvoke = AsyncMock(side_effect=RuntimeError("Fatal workflow orchestration crash"))

    incident = IncidentContext(
        id="inc-state-fail-01",
        projectId="proj-fail",
        title="Payment gateway fatal error",
        description="Crashing workflow test",
        service="payment-service",
        severity="CRITICAL",
        status="OPEN",
    )

    result = await inv_service.execute_investigation(
        incident_id=incident.id,
        incident=incident,
    )

    # State must be reliably set to FAILED with error captured
    assert result.status == InvestigationStatus.FAILED
    assert "Fatal workflow orchestration crash" in (result.error or "")


@pytest.mark.asyncio
async def test_gemini_repeated_504_triggers_bounded_fallback():
    """Verify that repeated Google 504 DEADLINE_EXCEEDED errors trigger bounded fallback with 504 in metadata."""
    class Mock504ServerError(Exception):
        code = 504

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=Mock504ServerError("504 DEADLINE_EXCEEDED: Deadline expired before operation could complete.")
    )

    llm = LLMService(
        provider="gemini",
        api_key="dummy_key",
        model="gemini-3.8-flash",
        timeout=1.0,
        max_retries=2,
        retry_delay=0.01,
    )
    llm.client = mock_client

    ev = EvidenceItem(
        id="ev-1",
        investigationId="inv-504-1",
        title="DB pool issue",
        type=EvidenceType.DATABASE,
        source="database",
        content="Database pool saturated at 100%",
        metadata={"pool_utilization": 1.0, "waiting_queries": 40},
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Database connection pool exhausted",
        incident_description="DB pool 100%",
        service="payment-service",
        evidence_list=[ev],
    )

    assert result["fallbackUsed"] is True
    assert "Gemini API error" in result["fallbackReason"]
    assert "504" in result["fallbackReason"]
    assert "connection pool exhaustion" in result["rootCause"].lower()


@pytest.mark.asyncio
async def test_gemini_overall_end_to_end_deadline_enforced():
    """Verify that total provider operation is bounded by timeout, not timeout * attempts."""
    import time
    import asyncio

    async def slow_call(*args, **kwargs):
        await asyncio.sleep(0.5)
        return MagicMock(text="{}")

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=slow_call)

    # Set total timeout to 0.15s with 3 retries (4 attempts total)
    # If deadline was per-attempt, it would take 4 * 0.15 = 0.6s
    # With overall deadline, it must complete within ~0.25s
    llm = LLMService(
        provider="gemini",
        api_key="dummy_key",
        model="gemini-3.5-flash",
        timeout=0.15,
        max_retries=3,
        retry_delay=0.01,
    )
    llm.client = mock_client

    ev = EvidenceItem(
        id="ev-1",
        investigationId="inv-deadline-1",
        title="Metrics drop",
        type=EvidenceType.METRIC,
        source="metrics",
        content="Drop detected",
    )

    t0 = time.time()
    result = await llm.analyze_and_formulate_rca(
        incident_title="Service degradation",
        incident_description="Latency spike",
        service="gateway",
        evidence_list=[ev],
    )
    elapsed = time.time() - t0

    assert result["fallbackUsed"] is True
    # Crucial assertion: Total time must NOT multiply by retry count (must be <= 0.35s)
    assert elapsed < 0.40, f"Expected total operation to finish within bounded deadline, took {elapsed}s"


@pytest.mark.asyncio
async def test_gemini_504_then_successful_retry_with_model_fallback():
    """Verify that a 504 on primary model triggers retry and recovers on fallback model candidate."""
    class Mock504ServerError(Exception):
        code = 504

    attempt_models = []
    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "summary": "Recovered root cause.",
        "hypotheses": [
            {
                "description": "Database pool saturation",
                "status": "SUPPORTED",
                "confidence": 0.92,
                "supportingEvidenceIds": ["ev-1"],
                "contradictingEvidenceIds": [],
                "reasoning": "Corroborated by database metrics.",
            }
        ],
        "rootCause": "Database pool saturation",
        "confidence": 0.92,
        "confidenceFactors": ["Pool metrics at 100%"],
        "recommendation": {
            "action": "Increase pool connections",
            "reason": "Prevents starvation",
            "riskLevel": "HIGH",
            "confidence": 0.92,
            "mitigationSteps": ["Scale database pool"],
        },
    })

    async def mock_call(*args, **kwargs):
        model = kwargs.get("model")
        attempt_models.append(model)
        if len(attempt_models) == 1:
            raise Mock504ServerError("504 DEADLINE_EXCEEDED")
        return mock_response

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(side_effect=mock_call)

    llm = LLMService(
        provider="gemini",
        api_key="dummy_key",
        model="gemini-3.8-flash",
        timeout=5.0,
        max_retries=2,
        retry_delay=0.01,
    )
    llm.client = mock_client

    ev = EvidenceItem(
        id="ev-1",
        investigationId="inv-model-fb-1",
        title="DB pool issue",
        type=EvidenceType.DATABASE,
        source="database",
        content="Database pool saturated at 100%",
        metadata={"pool_utilization": 1.0, "waiting_queries": 40},
    )

    result = await llm.analyze_and_formulate_rca(
        incident_title="Database connection pool exhausted",
        incident_description="DB pool 100%",
        service="payment-service",
        evidence_list=[ev],
    )

    # Verifications:
    # 1. Recovered on retry: fallbackUsed is False
    assert result["fallbackUsed"] is False
    assert result["rootCause"] == "Database pool saturation"
    # 2. Attempt 1 tried gemini-3.8-flash, Attempt 2 automatically flipped to gemini-3.5-flash
    assert attempt_models[0] == "gemini-3.8-flash"
    assert attempt_models[1] == "gemini-3.5-flash"


@pytest.mark.asyncio
async def test_gemini_safe_structured_timing_logs(caplog):
    """Verify safe structured timing logs are emitted per attempt without exposing sensitive content."""
    import logging

    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "summary": "Root cause identified.",
        "hypotheses": [
            {
                "description": "Downstream timeout",
                "status": "SUPPORTED",
                "confidence": 0.90,
                "supportingEvidenceIds": ["ev-1"],
                "contradictingEvidenceIds": [],
                "reasoning": "Corroborated by telemetry.",
            }
        ],
        "rootCause": "Downstream timeout",
        "confidence": 0.90,
        "confidenceFactors": ["Telemetry logs"],
        "recommendation": {
            "action": "Increase timeout",
            "reason": "Avoids failure",
            "riskLevel": "LOW",
            "confidence": 0.90,
            "mitigationSteps": ["Update config"],
        },
    })

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

    llm = LLMService(
        provider="gemini",
        api_key="super_secret_api_key_12345",
        model="gemini-3.5-flash",
        timeout=5.0,
    )
    llm.client = mock_client

    ev = EvidenceItem(
        id="ev-1",
        investigationId="inv-log-1",
        title="Logs",
        type=EvidenceType.LOG,
        source="logs",
        content="Sensitive user trace data in raw observation",
    )

    with caplog.at_level(logging.INFO, logger="LLMService"):
        await llm.analyze_and_formulate_rca(
            incident_title="Gateway 504",
            incident_description="Timeout",
            service="order-service",
            evidence_list=[ev],
        )

    # Check that structured timing log was recorded
    log_texts = [r.message for r in caplog.records if "Gemini provider attempt" in r.message]
    assert len(log_texts) >= 1
    log_msg = log_texts[0]
    assert "elapsed_ms=" in log_msg
    assert "status=SUCCESS" in log_msg
    assert "fallback_used=False" in log_msg

    # Security check: Ensure secret key is never in logs
    assert "super_secret_api_key_12345" not in caplog.text



