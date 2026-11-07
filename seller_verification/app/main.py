from fastapi import FastAPI
from pydantic import BaseModel, HttpUrl

app = FastAPI(title="trusTmart Seller Verification")


class SellerAssessRequest(BaseModel):
    legalName: str
    website: HttpUrl | None = None
    registrationNumber: str | None = None
    address: str | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/sellers/assess")
def assess_seller(request: SellerAssessRequest):
    # Placeholder. Real registry, website and address checks are added in later steps.
    return {
        "evidenceStatus": "UNKNOWN",
        "score": None,
        "explanation": "Checks are not implemented yet.",
    }