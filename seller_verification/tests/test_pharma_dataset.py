import csv
import pathlib
import re

DATA = pathlib.Path(__file__).resolve().parent.parent / "data" / "pharma" / "products.csv"
REQUIRED = [
    "record_id", "product_name", "brand_name", "generic_name", "dosage_form", "ndc",
    "gtin", "domain", "description", "source_name", "source_record_id", "source_url",
    "checked_on", "notes",
]
NDC_PATTERN = re.compile(r"^\d{4,5}-\d{3,4}(-\d{1,2})?$")


def load_rows():
    with DATA.open(encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def test_file_has_required_columns():
    with DATA.open(encoding="utf-8") as handle:
        header = csv.DictReader(handle).fieldnames
    assert set(REQUIRED) <= set(header)


def test_every_row_has_a_source_url():
    for row in load_rows():
        assert row["source_url"].startswith("https://"), f"row {row['record_id']} has no source URL"


def test_every_row_has_a_name_and_brand():
    for row in load_rows():
        assert row["product_name"].strip(), f"row {row['record_id']} has no name"
        assert row["brand_name"].strip(), f"row {row['record_id']} has no brand"


def test_ndc_is_in_ndc_format_and_never_in_gtin():
    for row in load_rows():
        assert NDC_PATTERN.match(row["ndc"].strip()), f"row {row['record_id']} has a bad NDC"
        assert row["gtin"].strip() != row["ndc"].strip(), f"row {row['record_id']} copied the NDC into gtin"


def test_gtin_is_digits_and_valid_length_when_present():
    for row in load_rows():
        gtin = row["gtin"].strip()
        if gtin:
            assert gtin.isdigit(), f"row {row['record_id']} gtin has non-digits"
            assert len(gtin) in (8, 12, 13, 14), f"row {row['record_id']} gtin length is wrong"


def test_minimum_fifty_records():
    assert len(load_rows()) >= 50