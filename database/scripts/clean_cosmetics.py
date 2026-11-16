import csv
import glob
import json
import os
from collections import Counter
from datetime import date

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data")

FIELDS = ["gtin", "product_name", "brand", "domain", "description",
          "model_part_number", "regulatory_id", "source_name",
          "source_url", "source_record_id", "collected_at"]


def clean(text):
    return " ".join((text or "").split())


def gtin_ok(code):
    if not code.isdigit() or len(code) not in (8, 12, 13, 14):
        return False
    digits = [int(c) for c in code]
    body, check = digits[:-1], digits[-1]
    total = 0
    for i, d in enumerate(reversed(body)):
        total += d * (3 if i % 2 == 0 else 1)
    return (10 - total % 10) % 10 == check


def load_products():
    products = []
    for path in sorted(glob.glob(os.path.join(RAW, "cosmetics_raw*.json"))):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for p in data.get("products", []):
            p["_file"] = os.path.basename(path)
            products.append(p)
    return products


def main():
    today = date.today().isoformat()
    accepted, rejected = [], []
    seen_codes, seen_names = set(), set()

    for p in load_products():
        code = clean(p.get("code"))
        name = clean(p.get("product_name"))
        brand = clean((p.get("brands") or "").split(",")[0])
        reason = None
        if not gtin_ok(code):
            reason = "invalid or missing barcode (format or check digit)"
        elif not name:
            reason = "missing product name"
        elif not brand:
            reason = "missing brand"
        elif code in seen_codes:
            reason = "duplicate barcode"
        elif (brand.lower(), name.lower()) in seen_names:
            reason = "duplicate brand and product name"

        if reason:
            rejected.append({"code": code, "product_name": name,
                             "brand": brand, "reason": reason,
                             "source_file": p["_file"]})
            continue

        seen_codes.add(code)
        seen_names.add((brand.lower(), name.lower()))
        desc = clean(p.get("generic_name")) or clean(p.get("categories"))
        qty = clean(p.get("quantity"))
        if qty:
            desc = (desc + " | Quantity: " + qty).strip(" |")
        accepted.append({
            "gtin": code,
            "product_name": name,
            "brand": brand,
            "domain": "COSMETICS_PERSONAL_CARE",
            "description": desc,
            "model_part_number": "",
            "regulatory_id": "",
            "source_name": "Open Beauty Facts",
            "source_url": "https://world.openbeautyfacts.org/product/" + code,
            "source_record_id": code,
            "collected_at": today,
        })

    accepted = accepted[:100]
    with open(os.path.join(OUT, "cosmetics_clean.csv"), "w",
              newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(accepted)

    with open(os.path.join(OUT, "cosmetics_clean.json"), "w",
              encoding="utf-8") as f:
        json.dump(accepted, f, ensure_ascii=False, indent=2)

    with open(os.path.join(OUT, "cosmetics_rejected.csv"), "w",
              newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["code", "product_name", "brand",
                                          "reason", "source_file"])
        w.writeheader()
        w.writerows(rejected)

    print("Accepted:", len(accepted))
    print("Rejected:", len(rejected))
    for reason, n in Counter(r["reason"] for r in rejected).items():
        print("  -", reason + ":", n)


main()