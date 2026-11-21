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


def test_no_category_checks_every_registry():
    body = post({})
    assert body["registriesRequired"] == {"mca": True, "fssai": True}


def test_pharmacy_company_requires_mca_only():
    body = post({"sellerCategory": "PHARMACY_COMPANY"})
    assert body["registriesRequired"] == {"mca": True, "fssai": False}


def test_food_person_requires_fssai_only():
    body = post({"sellerCategory": "FOOD_PERSON_OR_PARTNERSHIP"})
    assert body["registriesRequired"] == {"mca": False, "fssai": True}


def test_category_never_makes_a_seller_verified_without_evidence():
    body = post({"sellerCategory": "OTHER_PERSON_OR_PARTNERSHIP"})
    assert body["evidenceStatus"] != "VERIFIED"
    assert body["score"] is None


def test_unknown_category_is_rejected():
    response = client.post(
        "/api/sellers/assess", json={**BASE, "sellerCategory": "BANANA_SELLER"}
    )
    assert response.status_code == 422