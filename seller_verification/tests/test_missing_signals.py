from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# All names, numbers and domains below are FAKE sample data, for testing only.

FULL_SELLER = {
    "legalName": "Sharma Medical Pvt Ltd",
    "website": "https://sharmamedical.example",
    "registrationNumber": "SAMP00000000",
    "address": "1 Test Road, Sampletown",
}


def post(extra: dict) -> dict:
    return client.post("/api/sellers/assess", json={**FULL_SELLER, **extra}).json()


def test_no_product_or_provenance_never_verifies():
    body = post({})
    assert body["evidenceStatus"] != "VERIFIED"


def test_only_product_passed_never_verifies():
    body = post({"productCheck": "passed"})
    assert body["evidenceStatus"] != "VERIFIED"


def test_only_provenance_passed_never_verifies():
    body = post({"provenanceCompleteness": "passed"})
    assert body["evidenceStatus"] != "VERIFIED"


def test_both_passed_still_needs_registry_evidence():
    body = post({"productCheck": "passed", "provenanceCompleteness": "passed"})
    assert body["evidenceStatus"] != "VERIFIED"


def test_incomplete_provenance_counts_as_not_verified():
    body = post({"productCheck": "passed", "provenanceCompleteness": "could not be verified"})
    parts = {p["component"]: p["result"] for p in body["scoringBreakdown"]}
    assert parts["provenance_completeness"] == "could not be verified"
    assert body["evidenceStatus"] != "VERIFIED"


def test_missing_signals_are_shown_not_passed():
    body = post({})
    parts = {p["component"]: p["result"] for p in body["scoringBreakdown"]}
    assert parts["product_check"] == "could not be verified"
    assert parts["provenance_completeness"] == "could not be verified"


def test_missing_signal_never_gives_a_score():
    body = post({"productCheck": "passed", "provenanceCompleteness": "passed"})
    assert body["evidenceStatus"] == "UNKNOWN"
    assert body["score"] is None