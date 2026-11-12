from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, HttpUrl, field_validator

app = FastAPI(title="trusTmart Seller Verification")


class SellerAssessRequest(BaseModel):
    # Reject any field we did not define, so a typo is caught instead of silently ignored.
    model_config = ConfigDict(extra="forbid")

    legalName: str
    website: Optional[HttpUrl] = None
    registrationNumber: Optional[str] = None
    address: Optional[str] = None

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
    # Placeholder. Real registry, website and address checks are connected in a later task.
    return {
        "evidenceStatus": "UNKNOWN",
        "score": None,
        "explanation": "Checks are not implemented yet.",
    }