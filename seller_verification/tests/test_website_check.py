from app.website_check import check_website

# All names and domains below are FAKE sample data, for testing only.


def test_matching_domain_passes():
    assert check_website("sharmamedical.example", "Sharma Medical Pvt Ltd")["result"] == "passed"


def test_legal_suffix_is_ignored():
    assert check_website("sharmamedical.example", "Sharma Medical Private Limited")["result"] == "passed"


def test_www_and_https_are_handled():
    assert check_website("https://www.sharmamedical.example", "Sharma Medical Pvt Ltd")["result"] == "passed"


def test_unrelated_domain_fails():
    assert check_website("cheapmeds.example", "Sharma Medical Pvt Ltd")["result"] == "failed"


def test_partial_match_could_not_be_verified():
    assert check_website("sharma.example", "Sharma Medical Pvt Ltd")["result"] == "could not be verified"


def test_missing_website_could_not_be_verified():
    assert check_website(None, "Sharma Medical Pvt Ltd")["result"] == "could not be verified"


def test_sri_prefix_only_partially_matches():
    assert check_website("sharmamedical.example", "Sri Sharma Medical")["result"] == "could not be verified"