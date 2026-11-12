import pytest

from app.seller_model import (
    EvidenceRecord,
    SellerRecord,
    evidence_to_api,
    seller_to_api,
)

# All values below are FAKE sample data, for testing only.


def test_seller_record_holds_database_fields():
    seller = SellerRecord(
        legal_name="Sample Traders Pvt Ltd",
        seller_id=1,
        website="https://sample-traders.example",
        registration_ref="SAMP00000000",
        region="Maharashtra",
    )
    assert seller.legal_name == "Sample Traders Pvt Ltd"
    assert seller.registration_ref == "SAMP00000000"


def test_seller_api_uses_camel_case_names():
    seller = SellerRecord(
        legal_name="Sample Traders Pvt Ltd",
        seller_id=1,
        registration_ref="SAMP00000000",
    )
    api = seller_to_api(seller)
    assert api["sellerId"] == 1
    assert api["registrationNumber"] == "SAMP00000000"
    assert "registration_ref" not in api


def test_evidence_defaults_to_unknown():
    evidence = EvidenceRecord(seller_id=1)
    assert evidence.evidence_status == "UNKNOWN"


def test_evidence_accepts_allowed_statuses():
    for status in ("VERIFIED", "UNKNOWN", "HIGH_RISK"):
        assert EvidenceRecord(seller_id=1, evidence_status=status).evidence_status == status


@pytest.mark.parametrize("bad_status", ["verified", "PASSED", "", "Not Verified"])
def test_evidence_rejects_other_statuses(bad_status):
    with pytest.raises(ValueError):
        EvidenceRecord(seller_id=1, evidence_status=bad_status)


def test_evidence_api_uses_camel_case_names():
    evidence = EvidenceRecord(
        seller_id=1,
        evidence_status="UNKNOWN",
        source_url="https://example.com/source",
    )
    api = evidence_to_api(evidence)
    assert api["evidenceStatus"] == "UNKNOWN"
    assert api["sourceUrl"] == "https://example.com/source"
    assert "evidence_status" not in api