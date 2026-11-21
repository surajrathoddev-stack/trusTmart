from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, HttpUrl, field_validator

from app.address_check import check_address
from app.categories import required_registries
from app.registry import ManualRegistryProvider, check_registry
from app.scoring import score_assessment
from app.website_check import check_website

app = FastAPI(title="trusTmart Seller Verification")

SignalResult = Literal["passed", "failed", "could not be verified"]
SellerCategory = Literal[
    "FOOD_COMPANY",
    "FOOD_PERSON_OR_PARTNERSHIP",
    "PHARMACY_COMPANY",
    "OTHER_COMPANY",
    "OTHER_PERSON_OR_PARTNERSHIP",
]


class SellerAssessRequest(BaseModel):
    # Reject any field we did not define, so a typo is caught instead of silently ignored.
    model_config = ConfigDict(extra="forbid")

    legalName: str
    website: Optional[HttpUrl] = None
    registrationNumber: Optional[str] = None
    address: Optional[str] = None
    # Optional: when missing, the service keeps checking every registry as before.
    sellerCategory: Optional[SellerCategory] = None
    productCheck: Optional[SignalResult] = None
    provenanceCompleteness: Optional[SignalResult] = None

    @field_validator("legalName")
    @classmethod
    def legal_name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("legalName must not be empty")
        return value.strip()

    @field_validator("registrationNumber")
    @classmethod
    def registration_not_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not value.strip():
            raise ValueError("registrationNumber must not be blank if supplied")
        return value.strip()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/sellers/assess")
def assess_seller(request: SellerAssessRequest):
    checked_at = datetime.now(timezone.utc).isoformat()

    # Decide which registries apply. With no category, every registry check runs as before.
    if request.sellerCategory:
        needs = required_registries(request.sellerCategory)
    else:
        needs = {"mca": True, "fssai": True}

    # No reviewer records are loaded yet, so the registry check cannot pass.
    registry_factor = check_registry(
        ManualRegistryProvider([]),
        request.registrationNumber,
        request.legalName,
    )
    website_factor = check_website(
        str(request.website) if request.website else None,
        request.legalName,
    )
    # No registry address is available yet, so the address check cannot pass.
    address_factor = check_address(request.address, None)

    seller_factors = [registry_factor, website_factor, address_factor]

    # A missing signal stays "could not be verified" and never counts as a pass.
    product_result = request.productCheck or "could not be verified"
    provenance_result = request.provenanceCompleteness or "could not be verified"

    result = score_assessment(seller_factors, product_result, provenance_result)

    return {
        "sellerId": None,
        "sellerCategory": request.sellerCategory,
        "registriesRequired": needs,
        "evidenceStatus": result["evidenceStatus"],
        "score": result["score"],
        "factors": seller_factors,
        "scoringBreakdown": result["factors"],
        "explanation": result["explanation"],
        "sourceUrls": [],
        "checkedAt": checked_at,
    }