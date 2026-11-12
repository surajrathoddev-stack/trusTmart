from app.name_matching import compare_names
from app.registry import ManualRegistryProvider, RegistryRecord, check_registry

# All names and numbers below are FAKE sample data, for testing only.


def test_suffix_only_difference_is_a_match():
    assert compare_names("Sharma Medical", "Sharma Medical Pvt Ltd") == "match"


def test_extra_word_is_near():
    assert compare_names("Sri Sharma Medical", "Sharma Medical") == "near"


def test_different_company_is_different():
    assert compare_names("Sample Dairy Pvt Ltd", "Sample Traders Pvt Ltd") == "different"


def test_near_name_gives_could_not_be_verified():
    record = RegistryRecord("SAMP22222222", "Sri Sharma Medical", "ACTIVE")
    factor = check_registry(ManualRegistryProvider([record]), "SAMP22222222", "Sharma Medical")
    assert factor["result"] == "could not be verified"
    assert "reviewer" in factor["reason"]