from app.scoring import WEIGHTS, score_assessment

ALL_PASSED = [
    {"check": "registry match", "result": "passed"},
    {"check": "website domain", "result": "passed"},
]
ONE_MISSING = [
    {"check": "registry match", "result": "passed"},
    {"check": "website domain", "result": "could not be verified"},
]
ONE_FAILED = [
    {"check": "registry match", "result": "failed"},
]


def test_weights_add_up_to_one():
    assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


def test_all_parts_passed_is_verified_with_score():
    result = score_assessment(ALL_PASSED, "passed", "passed")
    assert result["evidenceStatus"] == "VERIFIED"
    assert result["score"] == 100


def test_missing_product_signal_is_unknown_without_score():
    result = score_assessment(ALL_PASSED, None, "passed")
    assert result["evidenceStatus"] == "UNKNOWN"
    assert result["score"] is None


def test_missing_seller_factor_is_unknown():
    result = score_assessment(ONE_MISSING, "passed", "passed")
    assert result["evidenceStatus"] == "UNKNOWN"
    assert result["score"] is None


def test_no_seller_factors_is_unknown():
    result = score_assessment([], "passed", "passed")
    assert result["evidenceStatus"] == "UNKNOWN"


def test_any_failure_is_high_risk_without_score():
    result = score_assessment(ONE_FAILED, "passed", "passed")
    assert result["evidenceStatus"] == "HIGH_RISK"
    assert result["score"] is None


def test_failure_beats_missing():
    result = score_assessment(ONE_FAILED, None, "failed")
    assert result["evidenceStatus"] == "HIGH_RISK"


def test_breakdown_lists_every_component():
    result = score_assessment(ALL_PASSED, None, None)
    assert len(result["factors"]) == 3


def test_explanation_states_it_is_not_product_proof():
    result = score_assessment(ALL_PASSED, "passed", "passed")
    assert "not proof" in result["explanation"]