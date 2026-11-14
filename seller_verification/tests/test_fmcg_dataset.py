import csv
import pathlib

DATA = pathlib.Path(__file__).resolve().parent.parent / "data" / "fmcg_food" / "products.csv"
REQUIRED = [
    "record_id", "product_name", "brand", "domain", "description", "barcode",
    "source_name", "source_record_id", "source_url", "checked_on", "notes",
]


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
        assert row["brand"].strip(), f"row {row['record_id']} has no brand"


def test_barcodes_are_digits_and_valid_length_when_present():
    for row in load_rows():
        barcode = row["barcode"].strip()
        if barcode:
            assert barcode.isdigit(), f"row {row['record_id']} barcode has non-digits"
            assert len(barcode) in (8, 12, 13, 14), f"row {row['record_id']} barcode length is wrong"


def test_minimum_fifty_records():
    assert len(load_rows()) >= 50