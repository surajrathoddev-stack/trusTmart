from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# All names, numbers and domains below are FAKE sample data, for testing only.

BASE = {
    "legalName": "Sharma Medical Pvt Ltd",
    "website": "https://sharmamedical.example",
    "registrationNumber": "SAMP00000000",
    "address": "1 Test Road, Sampletown",
}


def post(extra: dict) -> dict:
    return client.post("/api/sellers/assess", json={**BASE, **extra}).json()


def test_missing_signals_stay_unknown():
    body = post({})
    assert body["evidenceStatus"] == "UNKNOWN"
    assert body["score"] is None


def test_signals_alone_cannot_verify_without_registry_evidence():
    body = post({"productCheck": "passed", "provenanceCompleteness": "passed"})
    assert body["evidenceStatus"] == "UNKNOWN"
    assert body["score"] is None


def test_failed_product_signal_gives_high_risk():
    body = post({"productCheck": "failed"})
    assert body["evidenceStatus"] == "HIGH_RISK"
    assert body["score"] is None


def test_failed_provenance_signal_gives_high_risk():
    body = post({"provenanceCompleteness": "failed"})
    assert body["evidenceStatus"] == "HIGH_RISK"


def test_signal_appears_in_scoring_breakdown():
    body = post({"productCheck": "passed"})
    parts = {part["component"]: part["result"] for part in body["scoringBreakdown"]}
    assert parts["product_check"] == "passed"
    assert parts["provenance_completeness"] == "could not be verified"


def test_invalid_signal_value_is_rejected():
    response = client.post("/api/sellers/assess", json={**BASE, "productCheck": "maybe"})
    assert response.status_code == 422


def test_invalid_provenance_value_is_rejected():
    response = client.post(
        "/api/sellers/assess", json={**BASE, "provenanceCompleteness": "VERIFIED"}
    )
    assert response.status_code == 422