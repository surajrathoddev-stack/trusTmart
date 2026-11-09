\# Data Dictionary



\## Product domains (6)

ELECTRONICS, APPAREL\_FASHION, COSMETICS\_PERSONAL\_CARE, AUTOMOTIVE\_INDUSTRIAL, PHARMACEUTICALS, FMCG\_FOOD\_BEVERAGE



\## Catalogue files (database/data/\*\_clean.csv and .json)

One row per product type. These load into the table product\_master.



| Field | Type | Required | Meaning |

|---|---|---|---|

| gtin | text | no | Package barcode (GTIN/UPC/EAN). Stored as text so leading zeros are kept. Never generated. Unique when present. |

| product\_name | text | yes | Product name as shown in the source. |

| brand | text | yes | Brand or manufacturer name. |

| domain | text | yes | One of the 6 domain values above. |

| description | text | no | Short description (category and quantity from the source). |

| model\_part\_number | text | no | Manufacturer model or part number. Kept separate from GTIN. |

| regulatory\_id | text | no | Regulatory identifier such as NDC. Never stored as GTIN. |

| source\_name | text | yes | Name of the source. |

| source\_url | text | one of two | Link to the source record. |

| source\_record\_id | text | one of two | Id of the record in the source. At least one of source\_url or source\_record\_id is required. |

| collected\_at | date | no | Date the record was collected. |



\## Rejected-records files

Columns: code, product\_name, brand, reason, source\_file.



\## Rules applied

\- GTIN must be 8, 12, 13 or 14 digits and pass the check digit test when present.

\- Product name and brand are required.

\- Duplicates are rejected: same barcode, or same brand and product name.

\- A physical item is a product\_unit with its own unit\_id. The GTIN is never used as a unit id.



\## Other database tables

See docs/SCHEMA\_CONTRACT.md for roles, users, sellers, seller\_evidence, product\_unit, supply\_chain\_events, chain\_transactions and scan\_logs.

