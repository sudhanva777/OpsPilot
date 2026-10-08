import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "opspilot-ai"


def test_investigation_api_lifecycle():
    payload = {
        "incidentId": "inc-api-test-01",
        "incident": {
            "id": "inc-api-test-01",
            "projectId": "proj-uuid-1",
            "title": "Payment gateway 500 error spike",
            "description": "Database connection pool exhausted",
            "service": "payment-service",
            "severity": "CRITICAL",
            "status": "OPEN",
        },
    }

    # 1. POST /api/v1/investigations
    create_res = client.post("/api/v1/investigations", json=payload)
    assert create_res.status_code == 201
    data = create_res.json()
    inv_id = data["id"]
    assert data["status"] == "COMPLETED"
    assert "connection pool exhaustion" in data["rootCause"].lower()

    # 2. GET /api/v1/investigations/{id}
    get_res = client.get(f"/api/v1/investigations/{inv_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == inv_id

    # 3. GET /api/v1/investigations/{id}/evidence
    ev_res = client.get(f"/api/v1/investigations/{inv_id}/evidence")
    assert ev_res.status_code == 200
    assert len(ev_res.json()) >= 6

    # 4. GET /api/v1/investigations/{id}/hypotheses
    hyp_res = client.get(f"/api/v1/investigations/{inv_id}/hypotheses")
    assert hyp_res.status_code == 200
    assert len(hyp_res.json()) >= 3

    # 5. GET /api/v1/investigations/{id}/recommendation
    rec_res = client.get(f"/api/v1/investigations/{inv_id}/recommendation")
    assert rec_res.status_code == 200
    assert rec_res.json()["requiresApproval"] is True
    assert rec_res.json()["remediationExecuted"] is False

    # 6. GET /api/v1/investigations/{id}/runs
    runs_res = client.get(f"/api/v1/investigations/{inv_id}/runs")
    assert runs_res.status_code == 200
    assert len(runs_res.json()) >= 9

    # 7. 404 on nonexistent investigation
    not_found_res = client.get("/api/v1/investigations/nonexistent-id")
    assert not_found_res.status_code == 404
