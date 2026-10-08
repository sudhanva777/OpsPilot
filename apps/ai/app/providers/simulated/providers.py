from typing import Any, Dict, List, Optional
from ..base import (
    LogProvider,
    HealthProvider,
    DatabaseProvider,
    MetricsProvider,
    DeploymentProvider,
    ConfigurationProvider,
)
from ..fixtures.scenarios import match_scenario


class SimulatedLogProvider(LogProvider):
    """Simulated provider retrieving structured log entries from context or deterministic fixtures."""

    async def get_service_logs(
        self,
        service: str,
        limit: int = 100,
        start_time: Optional[str] = None,
        query: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        ctx = context or {}
        unavailable = ctx.get("unavailable_providers", []) + ctx.get("fail_providers", [])
        if "logs" in unavailable:
            raise RuntimeError(f"LogProvider unavailable for service '{service}'")

        telemetry = ctx.get("telemetry", {})
        if "logs" in telemetry:
            logs = telemetry["logs"]
        elif "mock_logs" in ctx:
            logs = ctx["mock_logs"]
        elif "logs" in ctx and isinstance(ctx["logs"], list):
            logs = ctx["logs"]
        else:
            scenario = match_scenario(
                title=ctx.get("title", ""),
                description=ctx.get("description", ""),
                service=service or ctx.get("service", ""),
            )
            logs = scenario["logs"]

        if query:
            q_lower = query.lower()
            logs = [l for l in logs if q_lower in str(l).lower()]
        return logs[:limit]


class SimulatedHealthProvider(HealthProvider):
    """Simulated provider inspecting service health status."""

    async def get_service_health(
        self,
        service: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        ctx = context or {}
        unavailable = ctx.get("unavailable_providers", []) + ctx.get("fail_providers", [])
        if "health" in unavailable:
            raise RuntimeError(f"HealthProvider unavailable for service '{service}'")

        telemetry = ctx.get("telemetry", {})
        if "health" in telemetry:
            return telemetry["health"]
        if "mock_health" in ctx:
            return ctx["mock_health"]
        if "health" in ctx and isinstance(ctx["health"], dict):
            return ctx["health"]

        scenario = match_scenario(
            title=ctx.get("title", ""),
            description=ctx.get("description", ""),
            service=service or ctx.get("service", ""),
        )
        return scenario["health"]


class SimulatedDatabaseProvider(DatabaseProvider):
    """Simulated provider inspecting database connection pools and queries."""

    async def get_database_health(
        self,
        database_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        ctx = context or {}
        unavailable = ctx.get("unavailable_providers", []) + ctx.get("fail_providers", [])
        if "database" in unavailable:
            raise RuntimeError(f"DatabaseProvider unavailable for database '{database_name or 'primary'}'")

        telemetry = ctx.get("telemetry", {})
        if "database" in telemetry:
            return telemetry["database"]
        if "mock_database" in ctx:
            return ctx["mock_database"]
        if "database" in ctx and isinstance(ctx["database"], dict):
            return ctx["database"]

        scenario = match_scenario(
            title=ctx.get("title", ""),
            description=ctx.get("description", ""),
            service=ctx.get("service", ""),
        )
        return scenario["database"]


class SimulatedMetricsProvider(MetricsProvider):
    """Simulated provider retrieving operational metrics (latency, error rate, RPS)."""

    async def get_service_metrics(
        self,
        service: str,
        timeframe: str = "1h",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        ctx = context or {}
        unavailable = ctx.get("unavailable_providers", []) + ctx.get("fail_providers", [])
        if "metrics" in unavailable:
            raise RuntimeError(f"MetricsProvider unavailable for service '{service}'")

        telemetry = ctx.get("telemetry", {})
        if "metrics" in telemetry:
            return telemetry["metrics"]
        if "mock_metrics" in ctx:
            return ctx["mock_metrics"]
        if "metrics" in ctx and isinstance(ctx["metrics"], dict):
            return ctx["metrics"]

        scenario = match_scenario(
            title=ctx.get("title", ""),
            description=ctx.get("description", ""),
            service=service or ctx.get("service", ""),
        )
        return scenario["metrics"]


class SimulatedDeploymentProvider(DeploymentProvider):
    """Simulated provider inspecting recent deployments and commits."""

    async def get_recent_deployments(
        self,
        service: str,
        limit: int = 5,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        ctx = context or {}
        unavailable = ctx.get("unavailable_providers", []) + ctx.get("fail_providers", [])
        if "deployment" in unavailable or "deployments" in unavailable:
            raise RuntimeError(f"DeploymentProvider unavailable for service '{service}'")

        telemetry = ctx.get("telemetry", {})
        if "deployment" in telemetry:
            return telemetry["deployment"][:limit]
        if "mock_deployment" in ctx:
            return ctx["mock_deployment"][:limit]
        if "deployment" in ctx and isinstance(ctx["deployment"], list):
            return ctx["deployment"][:limit]

        scenario = match_scenario(
            title=ctx.get("title", ""),
            description=ctx.get("description", ""),
            service=service or ctx.get("service", ""),
        )
        return scenario["deployment"][:limit]


class SimulatedConfigurationProvider(ConfigurationProvider):
    """Simulated provider inspecting configuration settings and recent changes."""

    async def get_configuration(
        self,
        service: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        ctx = context or {}
        unavailable = ctx.get("unavailable_providers", []) + ctx.get("fail_providers", [])
        if "configuration" in unavailable or "config" in unavailable:
            raise RuntimeError(f"ConfigurationProvider unavailable for service '{service}'")

        telemetry = ctx.get("telemetry", {})
        if "configuration" in telemetry:
            return telemetry["configuration"]
        if "mock_configuration" in ctx:
            return ctx["mock_configuration"]
        if "configuration" in ctx and isinstance(ctx["configuration"], dict):
            return ctx["configuration"]

        scenario = match_scenario(
            title=ctx.get("title", ""),
            description=ctx.get("description", ""),
            service=service or ctx.get("service", ""),
        )
        return scenario["configuration"]

