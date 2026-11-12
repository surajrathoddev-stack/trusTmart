import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# All values below are FAKE sample data, for testing only.

BAD_REQUESTS = [
    pytest.param({}, id="missing legalName"),
    pytest.param({"legalName": ""}, id="empty legalName"),
    pytest.param({"legalName": "   "}, id="blank legalName"),
    pytest.param({"legalName": "Sample Traders", "website": "not-a-url"}, id="invalid website"),
    pytest.param({"legalName": "Sample Traders", "registrationNumber": ""}, id="empty registrationNumber"),
    pytest.param({"legalName": "Sample Traders", "registrationNumber": "   "}, id="blank registrationNumber"),
    pytest.param({"legalName": "Sample Traders", "unexpectedField": "x"}, id="unknown field"),
]


@pytest.mark.parametrize("payload", BAD_REQUESTS)
def test_malformed_requests_are_rejected(payload):
    response = client.post("/api/sellers/assess", json=payload)
    assert response.status_code == 422


def test_valid_request_is_accepted_and_stays_unknown():
    response = client.post(
        "/api/sellers/assess",
        json={
            "legalName": "Sample Traders Pvt Ltd",
            "website": "https://sample-traders.example",
            "registrationNumber": "SAMP00000000",
            "address": "1 Test Road, Sampletown",
        },
    )
    assert response.status_code == 200
    assert response.json()["evidenceStatus"] == "UNKNOWN"