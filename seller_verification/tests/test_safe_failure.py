import pytest
from fastapi.testclient import TestClient

from app import main
from app.registry import (
    ManualRegistryProvider,
    RegistryRecord,
    RegistryUnavailable,
    check_registry,
)
from app.scoring import score_assessment

client = TestClient(main.app)

# All names, numbers and domains below are FAKE sample data, for testing only.

SAMPLE = RegistryRecord("SAMP00000000", "Sharma Medical Pvt Ltd", "ACTIVE")
FULL_PAYLOAD = {
    "legalName": "Sharma Medical Pvt Ltd",
    "website": "https://sharmamedical.example",
    "registrationNumber": "SAMP00000000",
    "address": "1 Test Road, Sampletown",
}


class UnreachableProvider:
    def find(self, registration_number):
        raise RegistryUnavailable("timeout")


class BrokenProvider:
    def find(self, registration_number):
        raise ValueError("unexpected response format")


def test_unreachable_source_is_not_verified():
    factor = check_registry(UnreachableProvider(), "SAMP00000000", "Sharma Medical Pvt Ltd")
    assert factor["result"] == "could not be verified"
    assert "could not be reached" in factor["reason"]


def test_unexpected_provider_error_is_not_verified():
    factor = check_registry(BrokenProvider(), "SAMP00000000", "Sharma Medical Pvt Ltd")
    assert factor["result"] == "could not be verified"


def test_duplicate_numbers_differing_only_in_spacing_are_rejected():
    duplicate = RegistryRecord("samp 0000 0000", "Sharma Medical Pvt Ltd", "ACTIVE")
    with pytest.raises(ValueError):
        ManualRegistryProvider([SAMPLE, duplicate])


def test_wrong_registered_name_gives_high_risk():
    other_company = RegistryRecord("SAMP00000000", "Other Co Pvt Ltd", "ACTIVE")
    factor = check_registry(
        ManualRegistryProvider([other_company]), "SAMP00000000", "Sharma Medical Pvt Ltd"
    )
    assert factor["result"] == "failed"
    result = score_assessment(
        [factor, {"check": "website domain", "result": "passed"}, {"check": "address consistency", "result": "passed"}],
        "passed",
        "passed",
    )
    assert result["evidenceStatus"] == "HIGH_RISK"
    assert result["score"] is None


def test_conflicting_website_gives_high_risk():
    factors = [
        {"check": "registry match", "result": "passed"},
        {"check": "website domain", "result": "failed"},
        {"check": "address consistency", "result": "passed"},
    ]
    result = score_assessment(factors, "passed", "passed")
    assert result["evidenceStatus"] == "HIGH_RISK"
    assert result["score"] is None


def test_unavailable_registry_with_other_passes_is_unknown():
    factors = [
        {"check": "registry match", "result": "could not be verified"},
        {"check": "website domain", "result": "passed"},
        {"check": "address consistency", "result": "passed"},
    ]
    result = score_assessment(factors, "passed", "passed")
    assert result["evidenceStatus"] == "UNKNOWN"
    assert result["score"] is None


def test_endpoint_with_unavailable_registry_is_unknown(monkeypatch):
    class DownProvider:
        def __init__(self, records):
            pass

        def find(self, registration_number):
            raise RegistryUnavailable("down")

    monkeypatch.setattr(main, "ManualRegistryProvider", DownProvider)
    body = client.post("/api/sellers/assess", json=FULL_PAYLOAD).json()
    assert body["evidenceStatus"] == "UNKNOWN"
    assert body["score"] is None


@pytest.mark.parametrize(
    "payload",
    [
        {"legalName": "Sharma Medical Pvt Ltd"},
        {"legalName": "Sharma Medical Pvt Ltd", "website": "https://sharmamedical.example"},
        {
            "legalName": "Sharma Medical Pvt Ltd",
            "website": "https://cheapmeds.example",
            "registrationNumber": "SAMP00000000",
            "address": "1 Test Road",
        },
        {
            "legalName": "Sri Sharma Medical",
            "website": "https://sharmamedical.example",
            "registrationNumber": "SAMP00000000",
            "address": "1 Test Road",
        },
    ],
)
def test_endpoint_never_verified_without_registry_evidence(payload):
    body = client.post("/api/sellers/assess", json=payload).json()
    assert body["evidenceStatus"] != "VERIFIED"
    assert body["score"] is None


def test_repeated_submissions_stay_unknown():
    first = client.post("/api/sellers/assess", json=FULL_PAYLOAD).json()
    second = client.post("/api/sellers/assess", json=FULL_PAYLOAD).json()
    assert first["evidenceStatus"] == "UNKNOWN"
    assert second["evidenceStatus"] == "UNKNOWN"