import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from ..providers.base import (
    LogProvider,
    HealthProvider,
    DatabaseProvider,
    MetricsProvider,
    DeploymentProvider,
    ConfigurationProvider,
)
from ..providers.simulated.providers import (
    SimulatedLogProvider,
    SimulatedHealthProvider,
    SimulatedDatabaseProvider,
    SimulatedMetricsProvider,
    SimulatedDeploymentProvider,
    SimulatedConfigurationProvider,
)

logger = logging.getLogger("InvestigationTools")


# ─── Tool Input Schemas ──────────────────────────────────────────────────────

class ServiceLogInput(BaseModel):
    service: str = Field(..., max_length=128, description="Target service identifier")
    limit: int = Field(default=50, ge=1, le=200, description="Max logs to return")
    query: Optional[str] = Field(default=None, max_length=128, description="Optional filter keyword")


class ServiceHealthInput(BaseModel):
    service: str = Field(..., max_length=128, description="Target service identifier")


class DatabaseHealthInput(BaseModel):
    database_name: Optional[str] = Field(default=None, max_length=128, description="Target database identifier")


class ServiceMetricsInput(BaseModel):
    service: str = Field(..., max_length=128, description="Target service identifier")
    timeframe: str = Field(default="1h", max_length=16, description="Metrics window")


class DeploymentHistoryInput(BaseModel):
    service: str = Field(..., max_length=128, description="Target service identifier")
    limit: int = Field(default=5, ge=1, le=20, description="Max recent deployments")


class ConfigurationInput(BaseModel):
    service: str = Field(..., max_length=128, description="Target service identifier")


# ─── Controlled Investigation Toolset ────────────────────────────────────────

class ControlledInvestigationTools:
    """Explicit, controlled tools with bounded capabilities. No shell or arbitrary code execution."""

    def __init__(
        self,
        log_provider: Optional[LogProvider] = None,
        health_provider: Optional[HealthProvider] = None,
        db_provider: Optional[DatabaseProvider] = None,
        metrics_provider: Optional[MetricsProvider] = None,
        deployment_provider: Optional[DeploymentProvider] = None,
        config_provider: Optional[ConfigurationProvider] = None,
    ):
        self.log_provider = log_provider or SimulatedLogProvider()
        self.health_provider = health_provider or SimulatedHealthProvider()
        self.db_provider = db_provider or SimulatedDatabaseProvider()
        self.metrics_provider = metrics_provider or SimulatedMetricsProvider()
        self.deployment_provider = deployment_provider or SimulatedDeploymentProvider()
        self.config_provider = config_provider or SimulatedConfigurationProvider()

    async def get_service_logs(
        self,
        service: str,
        limit: int = 50,
        query: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Audited retrieval of service logs."""
        params = ServiceLogInput(service=service, limit=limit, query=query)
        logger.info(f"[Tool:get_service_logs] service={params.service} limit={params.limit} query={params.query}")
        raw_logs = await self.log_provider.get_service_logs(
            service=params.service,
            limit=params.limit,
            query=params.query,
            context=context,
        )
        return {
            "source": f"logs:{params.service}",
            "tool": "get_service_logs",
            "record_count": len(raw_logs),
            "data": raw_logs,
        }

    async def get_service_health(
        self,
        service: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Audited inspection of service health status."""
        params = ServiceHealthInput(service=service)
        logger.info(f"[Tool:get_service_health] service={params.service}")
        health = await self.health_provider.get_service_health(
            service=params.service,
            context=context,
        )
        return {
            "source": f"health:{params.service}",
            "tool": "get_service_health",
            "data": health,
        }

    async def get_database_health(
        self,
        database_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Audited inspection of database health."""
        params = DatabaseHealthInput(database_name=database_name)
        logger.info(f"[Tool:get_database_health] database={params.database_name}")
        db_health = await self.db_provider.get_database_health(
            database_name=params.database_name,
            context=context,
        )
        return {
            "source": f"database:{params.database_name or 'primary'}",
            "tool": "get_database_health",
            "data": db_health,
        }

    async def get_service_metrics(
        self,
        service: str,
        timeframe: str = "1h",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Audited retrieval of operational metrics."""
        params = ServiceMetricsInput(service=service, timeframe=timeframe)
        logger.info(f"[Tool:get_service_metrics] service={params.service} timeframe={params.timeframe}")
        metrics = await self.metrics_provider.get_service_metrics(
            service=params.service,
            timeframe=params.timeframe,
            context=context,
        )
        return {
            "source": f"metrics:{params.service}",
            "tool": "get_service_metrics",
            "data": metrics,
        }

    async def get_recent_deployments(
        self,
        service: str,
        limit: int = 5,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Audited retrieval of recent deployments."""
        params = DeploymentHistoryInput(service=service, limit=limit)
        logger.info(f"[Tool:get_recent_deployments] service={params.service} limit={params.limit}")
        deployments = await self.deployment_provider.get_recent_deployments(
            service=params.service,
            limit=params.limit,
            context=context,
        )
        return {
            "source": f"deployments:{params.service}",
            "tool": "get_recent_deployments",
            "record_count": len(deployments),
            "data": deployments,
        }

    async def get_configuration(
        self,
        service: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Audited inspection of configuration."""
        params = ConfigurationInput(service=service)
        logger.info(f"[Tool:get_configuration] service={params.service}")
        config = await self.config_provider.get_configuration(
            service=params.service,
            context=context,
        )
        return {
            "source": f"configuration:{params.service}",
            "tool": "get_configuration",
            "data": config,
        }
