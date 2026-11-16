import csv, glob, json, os
from collections import Counter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DATA = os.path.join(ROOT, "data")
FIELDS = ["gtin", "product_name", "brand", "domain", "description",
          "model_part_number", "regulatory_id", "source_name",
          "source_url", "source_record_id", "collected_at"]


def main():
    rows, seen_gtin, seen_name, skipped = [], set(), set(), 0
    for path in sorted(glob.glob(os.path.join(DATA, "*_clean.csv"))):
        with open(path, encoding="utf-8", newline="") as f:
            for r in csv.DictReader(f):
                row = {k: (r.get(k) or "") for k in FIELDS}
                key = (row["brand"].lower(), row["product_name"].lower(), row["source_name"].lower())
                if (row["gtin"] and row["gtin"] in seen_gtin) or key in seen_name:
                    skipped += 1
                    continue
                if row["gtin"]:
                    seen_gtin.add(row["gtin"])
                seen_name.add(key)
                rows.append(row)
    with open(os.path.join(DATA, "catalogue_all.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(DATA, "catalogue_all.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("Catalogue records:", len(rows))
    print("Skipped duplicates:", skipped)
    for domain, n in sorted(Counter(r["domain"] for r in rows).items()):
        print(" ", domain, n)


if __name__ == "__main__":
    main()
