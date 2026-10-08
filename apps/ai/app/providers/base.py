from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class LogProvider(ABC):
    """Abstract interface for log retrieval."""

    @abstractmethod
    async def get_service_logs(
        self,
        service: str,
        limit: int = 100,
        start_time: Optional[str] = None,
        query: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve log entries for a given service."""
        pass


class HealthProvider(ABC):
    """Abstract interface for health check inspection."""

    @abstractmethod
    async def get_service_health(
        self,
        service: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Inspect health status for a service and its dependencies."""
        pass


class DatabaseProvider(ABC):
    """Abstract interface for database health and performance inspection."""

    @abstractmethod
    async def get_database_health(
        self,
        database_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Retrieve database metrics, connection pools, and query health."""
        pass


class MetricsProvider(ABC):
    """Abstract interface for operational metrics inspection."""

    @abstractmethod
    async def get_service_metrics(
        self,
        service: str,
        timeframe: str = "1h",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Retrieve latency, error rates, throughput, and resource utilization."""
        pass


class DeploymentProvider(ABC):
    """Abstract interface for deployment history inspection."""

    @abstractmethod
    async def get_recent_deployments(
        self,
        service: str,
        limit: int = 5,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve recent deployments for the service."""
        pass


class ConfigurationProvider(ABC):
    """Abstract interface for configuration inspection."""

    @abstractmethod
    async def get_configuration(
        self,
        service: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Inspect service configuration and recent configuration changes."""
        pass
