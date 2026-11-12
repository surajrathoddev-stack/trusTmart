from dataclasses import dataclass, field
from typing import Optional

ALLOWED_STATUSES = ("VERIFIED", "UNKNOWN", "HIGH_RISK")


@dataclass
class SellerRecord:
    """Matches the sellers table. seller_id is set by the database, not by us."""

    legal_name: str
    seller_id: Optional[int] = None
    website: Optional[str] = None
    registration_ref: Optional[str] = None
    region: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class EvidenceRecord:
    """Matches the seller_evidence table. evidence_id is set by the database."""

    seller_id: int
    evidence_status: str = "UNKNOWN"
    evidence_id: Optional[int] = None
    source_url: Optional[str] = None
    notes: Optional[str] = None
    checked_at: Optional[str] = None

    def __post_init__(self):
        if self.evidence_status not in ALLOWED_STATUSES:
            raise ValueError(f"evidence_status must be one of {ALLOWED_STATUSES}")


def seller_to_api(record: SellerRecord, sellerId_override: Optional[int] = None) -> dict:
    """Convert a database-style seller record into the camelCase API shape."""
    return {
        "sellerId": sellerId_override if sellerId_override is not None else record.seller_id,
        "legalName": record.legal_name,
        "website": record.website,
        "registrationNumber": record.registration_ref,
        "region": record.region,
        "checkedAt": record.created_at,
    }


def evidence_to_api(record: EvidenceRecord) -> dict:
    """Convert a database-style evidence record into the camelCase API shape."""
    return {
        "evidenceId": record.evidence_id,
        "sellerId": record.seller_id,
        "evidenceStatus": record.evidence_status,
        "sourceUrl": record.source_url,
        "notes": record.notes,
        "checkedAt": record.checked_at,
    }