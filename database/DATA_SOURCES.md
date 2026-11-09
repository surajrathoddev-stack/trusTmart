# Data Sources and Register (Database Module)

Collection date: 2026-11-09. All records come from public sources. No barcode was generated or guessed.

## Source register

| Domain | Source | URL | Record id used | Collected | Reuse / licence note |
|---|---|---|---|---|---|
| Cosmetics and Personal Care | Open Beauty Facts API v2 | https://world.openbeautyfacts.org | barcode (code) | 2026-11-07 | Open Database License (ODbL), contents under Database Contents License. Check the site's terms page before reuse and credit the source. |
| Automotive and Industrial Parts | Open Products Facts search | https://world.openproductsfacts.org | barcode (code) | 2026-11-09 | Same family and licence as above. Check the terms page before reuse. |
| Automotive and Industrial Parts | Official manufacturer websites (manual rows) | per-row source_url | model/part number | pending | Facts only (name, part number). Each row keeps its own page link. No rows accepted yet. |

UPCitemdb trial search was tried for Automotive and returned no results for the test query, so no records come from it.

## Counts (as of 2026-11-09)

| Domain | Accepted | Rejected | Notes |
|---|---|---|---|
| Cosmetics and Personal Care | 100 | 165 | 135 valid records were available. Only the first 100 were kept (upper limit of the task). 35 valid records were not used. |
| Automotive and Industrial Parts | 8 | 122 | Target is 50. Short by 42. Manual official-site rows are still needed. |
| Electronics | pending | - | To be supplied by Utkarsh. |
| Apparel and Fashion | pending | - | To be supplied by Utkarsh. |
| Pharmaceuticals | pending | - | To be supplied by Ruchita. |
| FMCG / Food and Beverage | pending | - | To be supplied by Ruchita. |

## Rejection reasons

Cosmetics (165): missing product name 117, missing brand 40, duplicate brand and product name 7, invalid barcode 1.
Automotive (122): excluded after manual review as not automotive or industrial 17, missing product name 99, invalid barcode 3, missing brand 2, duplicate barcode 1.
Full lists with the reason for each row: database/data/cosmetics_rejected.csv and database/data/automotive_rejected.csv.

## Records without a verifiable GTIN

None so far. Every accepted record has a barcode that passed the GTIN check digit test. Manual official-site rows may have no GTIN. In that case the gtin field stays empty and the model/part number is stored separately.

## Known gaps

- Open Products Facts has few real automotive items, so Automotive is below target.
- Electronics, Apparel, Pharmaceuticals and FMCG files had not been received when this was written.
- Descriptions come from category and quantity fields in the source and are short.
