import pytest
from app.providers.simulated.providers import (
    SimulatedLogProvider,
    SimulatedHealthProvider,
    SimulatedDatabaseProvider,
    SimulatedMetricsProvider,
    SimulatedDeploymentProvider,
    SimulatedConfigurationProvider,
)
from app.providers.fixtures.scenarios import (
    SCENARIO_PAYMENT_DB_POOL,
    SCENARIO_HIGH_LATENCY,
    SCENARIO_BAD_DEPLOYMENT,
    SCENARIO_AUTH_CONFIG,
    match_scenario,
)


@pytest.mark.asyncio
async def test_scenario_matcher():
    # Payment scenario matching
    scen_pay = match_scenario("Payment service returning 500", "orders failing", "payment-service")
    assert scen_pay["name"] == "payment-failure"

    # High latency scenario matching
    scen_lat = match_scenario("Elevated latency on order API", "slow database queries", "order-service")
    assert scen_lat["name"] == "high-latency"

    # Bad deployment scenario matching
    scen_dep = match_scenario("Errors after deployment", "crash in billing logic", "checkout-service")
    assert scen_dep["name"] == "bad-deployment"

    # Auth scenario matching
    scen_auth = match_scenario("API Gateway 401 unauthorized", "JWT verification failed", "api-gateway")
    assert scen_auth["name"] == "auth-config"


@pytest.mark.asyncio
async def test_simulated_providers_payment_scenario():
    context = {"title": "Payment service 500 errors", "service": "payment-service"}

    log_p = SimulatedLogProvider()
    logs = await log_p.get_service_logs("payment-service", limit=10, context=context)
    assert len(logs) > 0
    assert any("pool exhausted" in str(l).lower() for l in logs)

    health_p = SimulatedHealthProvider()
    health = await health_p.get_service_health("payment-service", context=context)
    assert health["status"] == "degraded"
    assert health["healthy"] is False

    db_p = SimulatedDatabaseProvider()
    db = await db_p.get_database_health(context=context)
    assert db["status"] == "critical"
    assert db["pool_utilization"] == 1.0

    metrics_p = SimulatedMetricsProvider()
    metrics = await metrics_p.get_service_metrics("payment-service", context=context)
    assert metrics["error_rate"] > 0.8
    assert metrics["latency_p99_ms"] > 10000

    dep_p = SimulatedDeploymentProvider()
    deps = await dep_p.get_recent_deployments("payment-service", context=context)
    assert len(deps) >= 1
    # Check that deployment was several days ago, not immediately preceding
    assert "2026-10-04" in deps[0]["deployed_at"]

    cfg_p = SimulatedConfigurationProvider()
    cfg = await cfg_p.get_configuration("payment-service", context=context)
    assert len(cfg["recent_changes"]) == 0
