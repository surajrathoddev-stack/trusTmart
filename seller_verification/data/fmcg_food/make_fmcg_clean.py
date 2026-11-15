import csv
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "products.csv"
OUT_DIR = HERE.parent / "catalogue_import"
OUT_DIR.mkdir(exist_ok=True)
OUT = OUT_DIR / "fmcg_clean.csv"

HEADER = ["gtin", "product_name", "brand", "domain", "description", "model_part_number",
          "regulatory_id", "source_name", "source_url", "source_record_id", "collected_at"]


def gtin_check_ok(code: str) -> bool:
    if not code.isdigit() or len(code) not in (8, 12, 13, 14):
        return False
    body, check = code[:-1], int(code[-1])
    total = sum(int(d) * (3 if i % 2 == 0 else 1) for i, d in enumerate(reversed(body)))
    return (10 - total % 10) % 10 == check


rows, seen_gtin, dropped = [], set(), 0
with SRC.open(encoding="utf-8-sig", newline="") as f:
    for r in csv.DictReader(f):
        barcode = r["barcode"].strip()
        if barcode and not gtin_check_ok(barcode):
            barcode, dropped = "", dropped + 1
        if barcode and barcode in seen_gtin:
            barcode = ""
        if barcode:
            seen_gtin.add(barcode)
        rows.append({
            "gtin": barcode,
            "product_name": r["product_name"].strip(),
            "brand": r["brand"].strip(),
            "domain": "FMCG_FOOD_BEVERAGE",
            "description": r["description"].strip(),
            "model_part_number": "",
            "regulatory_id": "",
            "source_name": r["source_name"].strip(),
            "source_url": r["source_url"].strip(),
            "source_record_id": r["source_record_id"].strip(),
            "collected_at": r["checked_on"].strip(),
        })

with OUT.open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=HEADER)
    w.writeheader()
    w.writerows(rows)

print(f"wrote {len(rows)} rows to {OUT.name}")
print(f"barcodes failing check digit (left empty): {dropped}")