REGISTRY_RULES = {
    "FOOD_COMPANY": {"mca": True, "fssai": True},
    "FOOD_PERSON_OR_PARTNERSHIP": {"mca": False, "fssai": True},
    "PHARMACY_COMPANY": {"mca": True, "fssai": False},
    "OTHER_COMPANY": {"mca": True, "fssai": False},
    "OTHER_PERSON_OR_PARTNERSHIP": {"mca": False, "fssai": False},
}


def required_registries(category: str) -> dict:
    if category not in REGISTRY_RULES:
        raise ValueError(f"unknown sellerCategory: {category}")
    return REGISTRY_RULES[category]