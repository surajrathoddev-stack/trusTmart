import pytest

from app.name_matching import names_match, normalize_name
from app.registry import (
    ManualRegistryProvider,
    RegistryRecord,
    RegistryUnavailable,
    check_registry,
)

# All names and numbers below are FAKE sample data, for testing logic only.
SAMPLE = RegistryRecord(
    registration_number="SAMP00000000",
    legal_name="Sample Traders Private Limited",
    status="ACTIVE",
    address="1 Test Road, Sampletown",
)


def test_normalize_treats_suffix_variants_as_equal():
    assert normalize_name("Sample Traders Pvt. Ltd.") == normalize_name(
        "SAMPLE TRADERS PRIVATE LIMITED"
    )


def test_names_match_ignores_case_and_punctuation():
    assert names_match("sample-traders pvt ltd", "Sample Traders Private Limited")


def test_different_company_names_do_not_match():
    assert not names_match("Sample Dairy Pvt Ltd", "Sample Traders Pvt Ltd")


def test_missing_registration_number_is_not_verified():
    factor = check_registry(ManualRegistryProvider([SAMPLE]), None, "Sample Traders Pvt Ltd")
    assert factor["result"] == "could not be verified"


def test_unknown_number_is_not_verified():
    factor = check_registry(
        ManualRegistryProvider([SAMPLE]), "NOTFOUND123", "Sample Traders Pvt Ltd"
    )
    assert factor["result"] == "could not be verified"


class UnreachableProvider:
    def find(self, registration_number):
        raise RegistryUnavailable("timeout")


def test_unreachable_registry_is_not_verified():
    factor = check_registry(UnreachableProvider(), "SAMP00000000", "Sample Traders Pvt Ltd")
    assert factor["result"] == "could not be verified"
    assert "could not be reached" in factor["reason"]


def test_inactive_status_fails():
    inactive = RegistryRecord("SAMP11111111", "Sample Traders Pvt Ltd", "INACTIVE")
    factor = check_registry(
        ManualRegistryProvider([inactive]), "SAMP11111111", "Sample Traders Pvt Ltd"
    )
    assert factor["result"] == "failed"


def test_name_mismatch_fails():
    factor = check_registry(ManualRegistryProvider([SAMPLE]), "SAMP00000000", "Sample Dairy Pvt Ltd")
    assert factor["result"] == "failed"


def test_full_match_passes():
    factor = check_registry(
        ManualRegistryProvider([SAMPLE]), "samp 0000 0000", "sample traders pvt ltd"
    )
    assert factor["result"] == "passed"


def test_duplicate_registration_numbers_are_rejected():
    with pytest.raises(ValueError):
        ManualRegistryProvider([SAMPLE, SAMPLE])