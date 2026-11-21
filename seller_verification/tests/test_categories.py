import pytest

from app.categories import required_registries


def test_food_company_needs_both():
    assert required_registries("FOOD_COMPANY") == {"mca": True, "fssai": True}


def test_food_person_needs_fssai_only():
    assert required_registries("FOOD_PERSON_OR_PARTNERSHIP") == {"mca": False, "fssai": True}


def test_pharmacy_company_needs_mca_only_for_now():
    assert required_registries("PHARMACY_COMPANY") == {"mca": True, "fssai": False}


def test_unknown_category_is_rejected():
    with pytest.raises(ValueError):
        required_registries("BANANA_SELLER")