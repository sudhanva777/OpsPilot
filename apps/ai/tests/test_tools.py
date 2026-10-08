import pytest
from app.tools.investigation_tools import ControlledInvestigationTools
from pydantic import ValidationError


@pytest.mark.asyncio
async def test_controlled_investigation_tools():
    tools = ControlledInvestigationTools()
    context = {"title": "Payment failures", "service": "payment-service"}

    # Service logs tool
    res = await tools.get_service_logs("payment-service", limit=5, context=context)
    assert res["tool"] == "get_service_logs"
    assert "source" in res
    assert len(res["data"]) <= 5

    # Database health tool
    res_db = await tools.get_database_health(context=context)
    assert res_db["tool"] == "get_database_health"
    assert res_db["data"]["status"] == "critical"

    # Service metrics tool
    res_metrics = await tools.get_service_metrics("payment-service", context=context)
    assert res_metrics["tool"] == "get_service_metrics"
    assert res_metrics["data"]["error_rate"] > 0.5


@pytest.mark.asyncio
async def test_controlled_tools_validation_rejection():
    tools = ControlledInvestigationTools()

    # Reject oversized service name
    with pytest.raises(ValidationError):
        await tools.get_service_logs("a" * 200)

    # Reject out-of-bounds limit
    with pytest.raises(ValidationError):
        await tools.get_service_logs("payment-service", limit=500)
