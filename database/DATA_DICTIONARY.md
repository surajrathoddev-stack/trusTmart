# Data Dictionary

## Product domains (6)
ELECTRONICS, APPAREL_FASHION, COSMETICS_PERSONAL_CARE, AUTOMOTIVE_INDUSTRIAL, PHARMACEUTICALS, FMCG_FOOD_BEVERAGE

## Catalogue files (database/data/*_clean.csv and .json)
One row per product type. These load into the table product_master.

| Field | Type | Required | Meaning |
|---|---|---|---|
| gtin | text | no | Package barcode (GTIN/UPC/EAN). Stored as text so leading zeros are kept. Never generated. Unique when present. |
| product_name | text | yes | Product name as shown in the source. |
| brand | text | yes | Brand or manufacturer name. |
| domain | text | yes | One of the 6 domain values above. |
| description | text | no | Short description (category and quantity from the source). |
| model_part_number | text | no | Manufacturer model or part number. Kept separate from GTIN. |
| regulatory_id | text | no | Regulatory identifier such as NDC. Never stored as GTIN. |
| source_name | text | yes | Name of the source. |
| source_url | text | one of two | Link to the source record. |
| source_record_id | text | one of two | Id of the record in the source. At least one of source_url or source_record_id is required. |
| collected_at | date | no | Date the record was collected. |

## Rejected-records files
Columns: code, product_name, brand, reason, source_file.

## Rules applied
- GTIN must be 8, 12, 13 or 14 digits and pass the check digit test when present.
- Product name and brand are required.
- Duplicates are rejected: same barcode, or same brand and product name.
- A physical item is a product_unit with its own unit_id. The GTIN is never used as a unit id.

## Other database tables
See docs/SCHEMA_CONTRACT.md for roles, users, sellers, seller_evidence, product_unit, supply_chain_events, chain_transactions and scan_logs.
