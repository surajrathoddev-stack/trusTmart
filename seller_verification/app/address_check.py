import re
from typing import Optional

# Common abbreviations, so "Rd" and "Road" compare as equal.
ABBREVIATIONS = {
    "rd": "road",
    "st": "street",
    "opp": "opposite",
    "bldg": "building",
    "flr": "floor",
    "nr": "near",
}


def normalize_address(address: str) -> str:
    text = address.lower()
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    words = [ABBREVIATIONS.get(word, word) for word in text.split()]
    return " ".join(words)


def check_address(seller_address: Optional[str], registry_address: Optional[str]) -> dict:
    """Compare two addresses. A difference is never 'failed': a company can have several premises."""
    factor = "address consistency"

    if not seller_address or not seller_address.strip():
        return {"check": factor, "result": "could not be verified", "reason": "no address supplied by the seller"}

    if not registry_address or not registry_address.strip():
        return {"check": factor, "result": "could not be verified", "reason": "no registry address available to compare"}

    seller_norm = normalize_address(seller_address)
    registry_norm = normalize_address(registry_address)

    if not seller_norm or not registry_norm:
        return {"check": factor, "result": "could not be verified", "reason": "address has no usable text"}

    if seller_norm == registry_norm:
        return {"check": factor, "result": "passed", "reason": "addresses match after normalising"}

    return {
        "check": factor,
        "result": "could not be verified",
        "reason": "addresses differ; a reviewer must confirm, since a company can have several premises",
    }