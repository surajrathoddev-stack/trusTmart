import re
from typing import Optional
from urllib.parse import urlparse

LEGAL_SUFFIXES = {"pvt", "ltd", "private", "limited", "llp"}


def _domain_text(website: str) -> str:
    raw = website.strip()
    if "://" not in raw:
        raw = "https://" + raw
    host = urlparse(raw).hostname or ""
    if host.startswith("www."):
        host = host[4:]
    return re.sub(r"[^a-z0-9]", "", host.lower())


def _name_words(legal_name: str) -> list[str]:
    words = re.sub(r"[^a-z0-9 ]+", " ", legal_name.lower()).split()
    return [w for w in words if w not in LEGAL_SUFFIXES]


def check_website(website: Optional[str], legal_name: str) -> dict:
    """Compare the business name with the website domain. Never passes without a match."""
    factor = "website domain"

    if not website or not website.strip():
        return {"check": factor, "result": "could not be verified", "reason": "no website supplied"}

    domain = _domain_text(website)
    words = _name_words(legal_name)
    if not domain or not words:
        return {"check": factor, "result": "could not be verified", "reason": "website or name too short to compare"}

    found = [w for w in words if w in domain]
    if len(found) == len(words):
        return {"check": factor, "result": "passed", "reason": "every word of the business name appears in the domain"}
    if found:
        return {
            "check": factor,
            "result": "could not be verified",
            "reason": "only some words of the business name appear in the domain; a reviewer must confirm",
        }
    return {"check": factor, "result": "failed", "reason": "the domain does not contain the business name"}