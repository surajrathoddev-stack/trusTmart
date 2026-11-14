import csv
import json
import pathlib

here = pathlib.Path(__file__).resolve().parent
rows = list(csv.DictReader((here / "products.csv").open(encoding="utf-8")))
(here / "products.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {len(rows)} records")