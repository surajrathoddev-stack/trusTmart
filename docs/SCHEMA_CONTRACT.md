**# trusTmart Schema Contract (PostgreSQL)**



**Source of truth: `database/migrations/\*.sql`. Apply with `bash database/scripts/migrate.sh`.**



**## roles**

**- role\_id (PK), role\_name (unique): ADMIN, MANUFACTURER, SUPPLIER, RETAILER, CONSUMER**



**## users**

**- user\_id (PK), email (unique), password\_hash, full\_name**

**- role\_id (FK roles), wallet\_address, is\_active, created\_at**



**## sellers**

**- seller\_id (PK), legal\_name, website, registration\_ref, region, created\_at**



**## seller\_evidence**

**- evidence\_id (PK), seller\_id (FK sellers)**

**- evidence\_status: VERIFIED | UNKNOWN | HIGH\_RISK**

**- source\_url, notes, checked\_at**



**## product\_master (one row per product type)**

**- product\_id (PK), gtin (TEXT, nullable, unique when present)**

**- product\_name, brand, domain, description**

**- model\_part\_number (separate from GTIN), regulatory\_id (e.g. NDC, never a GTIN)**

**- source\_name, source\_url, source\_record\_id, collected\_at, created\_at**

**- domain values: ELECTRONICS, APPAREL\_FASHION, COSMETICS\_PERSONAL\_CARE,**

&#x20; **AUTOMOTIVE\_INDUSTRIAL, PHARMACEUTICALS, FMCG\_FOOD\_BEVERAGE**

**- Rule: source\_url or source\_record\_id is required.**



**## product\_unit (one row per physical item)**

**- unit\_id (UUID, PK), product\_id (FK product\_master)**

**- serial\_number, batch\_number, manufacturer\_user\_id (FK users)**

**- data\_hash, current\_status, current\_location, is\_sold, created\_at**

**- unique (product\_id, serial\_number)**

**- Rule: GTIN is never used as the unit ID.**



**## supply\_chain\_events**

**- event\_id (PK), unit\_id (FK product\_unit)**

**- event\_type: REGISTERED | TRANSFERRED | RECEIVED | LOCATION\_UPDATE | SOLD**

**- actor\_user\_id (FK users), seller\_id (FK sellers), location, note, created\_at**



**## chain\_transactions**

**- tx\_id (PK), event\_id (FK supply\_chain\_events)**

**- tx\_hash (unique), network (default sepolia), block\_number**

**- tx\_status: PENDING | CONFIRMED | FAILED, created\_at**



**## scan\_logs**

**- scan\_id (PK), unit\_id (FK product\_unit), scanned\_by\_user\_id (FK users)**

**- result: AUTHENTIC | SUSPICIOUS | UNVERIFIED**

**- reason, scan\_location, scanned\_at**



**## Conventions**

**- GTIN/barcodes are TEXT so leading zeros are kept.**

**- Timestamps are TIMESTAMPTZ.**

**- Dataset files use the product\_master field names above.**

