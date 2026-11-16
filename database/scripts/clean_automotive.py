import csv
import glob
import json
import os
from collections import Counter
from datetime import date
from urllib.parse import urlparse

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
    total = 0
    for i, d in enumerate(reversed(digits[:-1])):
        total += d * (3 if i % 2 == 0 else 1)
    return (10 - total % 10) % 10 == digits[-1]


def main():
    today = date.today().isoformat()
    accepted, rejected = [], []
    ex = os.path.join(RAW, "exclude_barcodes.txt")
    excluded = set(l.strip() for l in open(ex) if l.strip()) if os.path.exists(ex) else set()
    seen_codes, seen_names = set(), set()

    def check(gtin, name, brand, url, need_url):
        if need_url and not url.startswith("http"):
            return "missing or invalid source_url"
        if not name:
            return "missing product name"
        if not brand:
            return "missing brand"
        if gtin and not gtin_ok(gtin):
            return "invalid barcode (format or check digit)"
        if gtin and gtin in seen_codes:
            return "duplicate barcode"
        if (brand.lower(), name.lower()) in seen_names:
            return "duplicate brand and product name"
        return None

    def add(rec, reason, src_file):
        if reason:
            rejected.append({"code": rec["gtin"],
                             "product_name": rec["product_name"],
                             "brand": rec["brand"], "reason": reason,
                             "source_file": src_file})
            return
        if rec["gtin"]:
            seen_codes.add(rec["gtin"])
        seen_names.add((rec["brand"].lower(), rec["product_name"].lower()))
        accepted.append(rec)

    # 1) Open Products Facts downloads
    for path in sorted(glob.glob(os.path.join(RAW, "auto_*.json"))):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        for p in data.get("products", []) or []:
            code = clean(p.get("code"))
            name = clean(p.get("product_name"))
            brand = clean((p.get("brands") or "").split(",")[0])
            url = "https://world.openproductsfacts.org/product/" + code
            desc = clean(p.get("generic_name")) or clean(p.get("categories"))
            qty = clean(p.get("quantity"))
            if qty:
                desc = (desc + " | Quantity: " + qty).strip(" |")
            rec = {"gtin": code, "product_name": name, "brand": brand,
                   "domain": "AUTOMOTIVE_INDUSTRIAL", "description": desc,
                   "model_part_number": "", "regulatory_id": "",
                   "source_name": "Open Products Facts",
                   "source_url": url, "source_record_id": code,
                   "collected_at": today}
            reason = None if gtin_ok(code) else "invalid or missing barcode (format or check digit)"
            if code in excluded:
                reason = "excluded after manual review: not an automotive or industrial product"
            reason = reason or check(code, name, brand, url, False)
            add(rec, reason, os.path.basename(path))

    # 2) Manually collected rows from official manufacturer sites
    manual = os.path.join(RAW, "automotive_manual.csv")
    if os.path.exists(manual):
        with open(manual, newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                name = clean(row.get("product_name"))
                brand = clean(row.get("brand"))
                part = clean(row.get("model_part_number"))
                url = clean(row.get("source_url"))
                gtin = clean(row.get("gtin"))
                host = urlparse(url).netloc or "unknown"
                rec = {"gtin": gtin, "product_name": name, "brand": brand,
                       "domain": "AUTOMOTIVE_INDUSTRIAL",
                       "description": clean(row.get("description")),
                       "model_part_number": part, "regulatory_id": "",
                       "source_name": "Official manufacturer website (" + host + ")",
                       "source_url": url, "source_record_id": part,
                       "collected_at": today}
                add(rec, check(gtin, name, brand, url, True),
                    "automotive_manual.csv")

    accepted = accepted[:100]

    with open(os.path.join(OUT, "automotive_clean.csv"), "w",
              newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(accepted)
    with open(os.path.join(OUT, "automotive_clean.json"), "w",
              encoding="utf-8") as f:
        json.dump(accepted, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT, "automotive_rejected.csv"), "w",
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