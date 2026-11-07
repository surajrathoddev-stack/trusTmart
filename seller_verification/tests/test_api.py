from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_missing_legal_name_is_rejected():
    response = client.post(
        "/api/sellers/assess",
        json={"website": "https://example.com"},
    )
    assert response.status_code == 422


def test_seller_with_only_a_name_is_unknown():
    response = client.post(
        "/api/sellers/assess",
        json={"legalName": "Test Company Pvt Ltd"},
    )
    assert response.status_code == 200
    assert response.json()["evidenceStatus"] == "UNKNOWN"