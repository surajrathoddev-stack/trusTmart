from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# All names, numbers and domains below are FAKE sample data, for testing only.


def post(payload: dict) -> dict:
    return client.post("/api/sellers/assess", json=payload).json()


FULL_INPUT = {
    "legalName": "Sharma Medical Pvt Ltd",
    "website": "https://sharmamedical.example",
    "registrationNumber": "SAMP00000000",
    "address": "1 Test Road, Sampletown",
}


def test_response_contains_all_required_fields():
    body = post({"legalName": "Sharma Medical Pvt Ltd"})
    for key in [
        "sellerId",
        "evidenceStatus",
        "score",
        "factors",
        "scoringBreakdown",
        "explanation",
        "sourceUrls",
        "checkedAt",
    ]:
        assert key in body


def test_full_input_stays_unknown_without_registry_evidence():
    body = post(FULL_INPUT)
    assert body["evidenceStatus"] == "UNKNOWN"
    assert body["score"] is None


def test_each_check_is_reported_with_its_result():
    body = post(FULL_INPUT)
    results = {factor["check"]: factor["result"] for factor in body["factors"]}
    assert results["website domain"] == "passed"
    assert results["registry match"] == "could not be verified"
    assert results["address consistency"] == "could not be verified"


def test_unrelated_website_gives_high_risk():
    body = post({"legalName": "Sharma Medical Pvt Ltd", "website": "https://cheapmeds.example"})
    assert body["evidenceStatus"] == "HIGH_RISK"
    assert body["score"] is None


def test_never_verified_without_registry_evidence():
    assert post(FULL_INPUT)["evidenceStatus"] != "VERIFIED"


def test_source_urls_empty_until_sources_are_connected():
    assert post(FULL_INPUT)["sourceUrls"] == []


def test_checked_at_is_set():
    assert post(FULL_INPUT)["checkedAt"]