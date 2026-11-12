from dataclasses import dataclass
from typing import Optional, Protocol

from app.name_matching import compare_names


class RegistryUnavailable(Exception):
    """Raised when a registry cannot be reached or gives an unusable response."""


@dataclass
class RegistryRecord:
    registration_number: str
    legal_name: str
    status: str
    address: Optional[str] = None
    source_url: Optional[str] = None
    checked_on: Optional[str] = None


class RegistryProvider(Protocol):
    def find(self, registration_number: str) -> Optional[RegistryRecord]:
        ...


def _clean_number(value: str) -> str:
    return "".join(value.split()).upper()


class ManualRegistryProvider:
    """Serves records a reviewer has entered by hand. Makes no network calls."""

    def __init__(self, records: list[RegistryRecord]):
        self._by_number: dict[str, RegistryRecord] = {}
        for record in records:
            key = _clean_number(record.registration_number)
            if key in self._by_number:
                raise ValueError(f"duplicate registration number: {record.registration_number}")
            self._by_number[key] = record

    def find(self, registration_number: str) -> Optional[RegistryRecord]:
        return self._by_number.get(_clean_number(registration_number))


def _factor(name: str, result: str, reason: str) -> dict:
    return {"check": name, "result": result, "reason": reason}


def check_registry(
    provider: RegistryProvider,
    registration_number: Optional[str],
    legal_name: str,
) -> dict:
    """Return one factor for the registry check. Never passes without evidence."""
    factor = "registry match"

    if not registration_number:
        return _factor(factor, "could not be verified", "no registration number supplied")

    try:
        record = provider.find(registration_number)
    except RegistryUnavailable:
        return _factor(factor, "could not be verified", "registry could not be reached")
    except Exception:
        # Any unexpected failure from a source must never become a pass.
        return _factor(factor, "could not be verified", "registry returned an unusable response")

    if record is None:
        return _factor(factor, "could not be verified", "no registry record found for this number")

    if record.status.strip().upper() != "ACTIVE":
        return _factor(factor, "failed", f"registry status is {record.status}")

    name_result = compare_names(record.legal_name, legal_name)
    if name_result == "different":
        return _factor(
            factor,
            "failed",
            f"registered name is '{record.legal_name}', not '{legal_name}'",
        )
    if name_result == "near":
        return _factor(
            factor,
            "could not be verified",
            f"names are similar but not identical ('{record.legal_name}' vs '{legal_name}'); a reviewer must confirm",
        )

    return _factor(factor, "passed", "number, status and name match the registry record")