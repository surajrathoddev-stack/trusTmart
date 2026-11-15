# API Examples

These examples were copied from the running service. All names, numbers and domains are FAKE sample values.

## GET /health

Response:

{"status": "ok"}

## POST /api/sellers/assess, Example A (name only)

Request:

    {"legalName": "Sharma Medical Pvt Ltd"}

Response:

response {
  "sellerId": null,
  "evidenceStatus": "UNKNOWN",
  "score": null,
  "factors": [
    {
      "check": "registry match",
      "result": "could not be verified",
      "reason": "no registration number supplied"
    },
    {
      "check": "website domain",
      "result": "could not be verified",
      "reason": "no website supplied"
    },
    {
      "check": "address consistency",
      "result": "could not be verified",
      "reason": "no address supplied by the seller"
    }
  ],
  "scoringBreakdown": [
    {
      "component": "seller_evidence",
      "weight": 0.4,
      "result": "could not be verified"
    },
    {
      "component": "product_check",
      "weight": 0.4,
      "result": "could not be verified"
    },
    {
      "component": "provenance_completeness",
      "weight": 0.2,
      "result": "could not be verified"
    }
  ],
  "explanation": "some evidence is missing or could not be verified. This is a seller evidence score only, not proof that any product is genuine.",
  "sourceUrls": [],
  "checkedAt": "2026-11-14T10:03:24.741441+00:00"
}

## POST /api/sellers/assess, Example B (unrelated website)

Request:

    {"legalName": "Sharma Medical Pvt Ltd", "website": "https://cheapmeds.example", "registrationNumber": "SAMP00000000", "address": "1 Test Road, Sampletown"}

Response:
{
"sellerId": null,
  "evidenceStatus": "HIGH_RISK",
  "score": null,
  "factors": [
    {
      "check": "registry match",
      "result": "could not be verified",
      "reason": "no registry record found for this number"
    },
    {
      "check": "website domain",
      "result": "failed",
      "reason": "the domain does not contain the business name"
    },
    {
      "check": "address consistency",
      "result": "could not be verified",
      "reason": "no registry address available to compare"
    }
  ],
  "scoringBreakdown": [
    {
      "component": "seller_evidence",
      "weight": 0.4,
      "result": "failed"
    },
    {
      "component": "product_check",
      "weight": 0.4,
      "result": "could not be verified"
    },
    {
      "component": "provenance_completeness",
      "weight": 0.2,
      "result": "could not be verified"
    }
  ],
  "explanation": "at least one check failed or contradicts the record. This is a seller evidence score only, not proof that any product is genuine.",
  "sourceUrls": [],
  "checkedAt": "2026-11-14T10:05:35.000004+00:00"
}
## Notes

- sellerId is null until storage is approved.
- sourceUrls is empty until a live source is approved.
- productCheck and provenanceCompleteness are our proposal, not yet agreed with the backend team.