
## DRAFT: not agreed

To  backend Member:

Which seller categories exist, and which registries each one requires (for example, a food seller needs MCA and FSSAI)?
Do you agree that the backend assigns sellerId and assessmentId, and our service echoes sellerId?
Do you agree with SHA-256 over sorted fields for evidenceHash, or does the blockchain side need a different format?
Do you agree with the response shape above, with trustScore in place of score?

To Database Member:

Can you add an assessment table holding seller ID, status, trust score, explanation and checked time, with its own ID column?
Can seller_evidence get an evidence_hash column, to match the hash on the blockchain?
Is the regulatory_id answer (package code or product code) still open?
{
  "contractVersion": "v1-draft",
  "assessment": {
    "sellerId": null,
    "sellerCategory": "FOOD_SELLER",
    "evidenceStatus": "UNKNOWN",
    "trustScore": null,
    "explanation": "Some evidence is missing or could not be verified. This is a seller evidence score only, not proof that any product is genuine.",
    "checkedAt": "2026-11-15T10:00:00Z"
  },
  "evidence": [
    {
      "check": "registry match",
      "result": "could not be verified",
      "reason": "no registry record found for this number",
      "sourceUrl": null,
      "checkedAt": "2026-11-15T10:00:00Z",
      "evidenceHash": "sha256:..."
    }
  ],
  "scoringBreakdown": [
    { "component": "seller_evidence", "weight": 0.4, "result": "could not be verified" }
  ],
  "sourceUrls": []
}