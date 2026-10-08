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
    """Simulated provider retrieving structured log entries from deterministic fixtures."""

    async def get_service_logs(
        self,
        service: str,
        limit: int = 100,
        start_time: Optional[str] = None,
        query: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        ctx = context or {}
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
        scenario = match_scenario(
            title=ctx.get("title", ""),
            description=ctx.get("description", ""),
            service=service or ctx.get("service", ""),
        )
        return scenario["configuration"]
