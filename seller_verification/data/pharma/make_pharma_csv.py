import csv
import sys
from pathlib import Path

if len(sys.argv) != 3:
    sys.exit("usage: python make_pharma_csv.py <downloaded_ndc_file.csv> <source_page_https_url>")

raw_path, source_url = sys.argv[1], sys.argv[2]
if not source_url.startswith("https://"):
    sys.exit("source_url must start with https://")

HEADER = [
    "record_id", "product_name", "brand_name", "generic_name", "dosage_form", "ndc",
    "gtin", "domain", "description", "source_name", "source_record_id", "source_url",
    "checked_on", "notes",
]
CHECKED_ON = "2026-11-14"
LIMIT = 60

out_rows, seen = [], set()
with open(raw_path, encoding="utf-8-sig", newline="") as handle:
    for raw in csv.DictReader(handle):
        product_ndc = raw["Product NDC"].strip()
        package_ndc = raw["NDC Package Code"].strip()
        brand = raw["Proprietary Name"].strip()
        if not brand or not package_ndc or product_ndc in seen:
            continue
        if raw["End Marketing Date"].strip() != "N/A":
            continue
        seen.add(product_ndc)
        out_rows.append({
            "record_id": len(out_rows) + 1,
            "product_name": brand,
            "brand_name": brand,
            "generic_name": raw["Nonproprietary Name"].strip(),
            "dosage_form": raw["Dosage Form"].strip(),
            "ndc": package_ndc,
            "gtin": "",
            "domain": "Pharmaceuticals",
            "description": f"{raw['Strength'].strip()} {raw['Dosage Form'].strip()} {raw['Route'].strip()}".strip(),
            "source_name": "FDA NDC Directory",
            "source_record_id": package_ndc,
            "source_url": source_url,
            "checked_on": CHECKED_ON,
            "notes": f"Product NDC {product_ndc}; labeler {raw['Labeler Name'].strip()}; no package barcode in source",
        })
        if len(out_rows) == LIMIT:
            break

out_path = Path(__file__).resolve().parent / "products.csv"
with open(out_path, "w", encoding="utf-8", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=HEADER)
    writer.writeheader()
    writer.writerows(out_rows)

print(f"wrote {len(out_rows)} records to {out_path.name}")