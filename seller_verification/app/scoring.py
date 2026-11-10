from typing import Optional

PASSED = "passed"
FAILED = "failed"
NOT_VERIFIED = "could not be verified"

# Starting weights from the project specification. They must add up to 1.0.
WEIGHTS = {
    "seller_evidence": 0.40,
    "product_check": 0.40,
    "provenance_completeness": 0.20,
}


def _normalise(result: Optional[str]) -> Optional[str]:
    """Return PASSED, FAILED, or None. Anything else counts as missing."""
    if result == PASSED:
        return PASSED
    if result == FAILED:
        return FAILED
    return None


def seller_component(factors: list[dict]) -> Optional[str]:
    """Combine the seller checks into one result for the seller_evidence part."""
    if not factors:
        return None
    results = [_normalise(f.get("result")) for f in factors]
    if FAILED in results:
        return FAILED
    if all(r == PASSED for r in results):
        return PASSED
    return None


def score_assessment(
    seller_factors: list[dict],
    product_result: Optional[str] = None,
    provenance_result: Optional[str] = None,
) -> dict:
    components = {
        "seller_evidence": seller_component(seller_factors),
        "product_check": _normalise(product_result),
        "provenance_completeness": _normalise(provenance_result),
    }

    breakdown = [
        {
            "component": name,
            "weight": weight,
            "result": components[name] or NOT_VERIFIED,
        }
        for name, weight in WEIGHTS.items()
    ]

    values = list(components.values())
    if FAILED in values:
        status = "HIGH_RISK"
        reason = "at least one check failed or contradicts the record"
    elif None in values:
        status = "UNKNOWN"
        reason = "some evidence is missing or could not be verified"
    else:
        status = "VERIFIED"
        reason = "all checks passed"

    score = None
    if status == "VERIFIED":
        score = round(100 * sum(WEIGHTS[name] for name in WEIGHTS if components[name] == PASSED))

    return {
        "evidenceStatus": status,
        "score": score,
        "factors": breakdown,
        "explanation": f"{reason}. This is a seller evidence score only, not proof that any product is genuine.",
    }