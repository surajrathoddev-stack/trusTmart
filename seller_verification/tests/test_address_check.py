from app.address_check import check_address

# All addresses below are FAKE sample data, for testing only.


def test_identical_addresses_pass():
    result = check_address("1 Test Road, Sampletown", "1 Test Road, Sampletown")
    assert result["result"] == "passed"


def test_case_and_punctuation_are_ignored():
    result = check_address("1, TEST ROAD. Sampletown", "1 test road sampletown")
    assert result["result"] == "passed"


def test_abbreviation_matches_full_word():
    result = check_address("1 Test Rd, Sampletown", "1 Test Road, Sampletown")
    assert result["result"] == "passed"


def test_different_address_needs_review():
    result = check_address("9 Other Lane, Sampletown", "1 Test Road, Sampletown")
    assert result["result"] == "could not be verified"
    assert "reviewer" in result["reason"]


def test_missing_seller_address_is_not_verified():
    result = check_address(None, "1 Test Road, Sampletown")
    assert result["result"] == "could not be verified"


def test_missing_registry_address_is_not_verified():
    result = check_address("1 Test Road, Sampletown", "")
    assert result["result"] == "could not be verified"


def test_symbols_only_address_is_not_verified():
    result = check_address("!!!", "1 Test Road, Sampletown")
    assert result["result"] == "could not be verified"


def test_mismatch_is_never_failed():
    result = check_address("9 Other Lane", "1 Test Road")
    assert result["result"] != "failed"