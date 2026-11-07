# trusTmart Schema Contract (PostgreSQL)

Source of truth: `database/migrations/*.sql`. Apply with `bash database/scripts/migrate.sh`.

## roles

- role_id (PK), role_name (unique): ADMIN, MANUFACTURER, SUPPLIER, RETAILER, CONSUMER

## users

- user_id (PK), email (unique), password_hash, full_name

- role_id (FK roles), wallet_address, is_active, created_at

## sellers

- seller_id (PK), legal_name, website, registration_ref, region, created_at

## seller_evidence

- evidence_id (PK), seller_id (FK sellers)

- evidence_status: VERIFIED | UNKNOWN | HIGH_RISK

- source_url, notes, checked_at

## product_master (one row per product type)

- product_id (PK), gtin (TEXT, nullable, unique when present)

- product_name, brand, domain, description

- model_part_number (separate from GTIN), regulatory_id (e.g. NDC, never a GTIN)

- source_name, source_url, source_record_id, collected_at, created_at

- domain values: ELECTRONICS, APPAREL_FASHION, COSMETICS_PERSONAL_CARE,

&#x20; **AUTOMOTIVE_INDUSTRIAL, PHARMACEUTICALS, FMCG_FOOD_BEVERAGE

- Rule: source_url or source_record_id is required.

## product_unit (one row per physical item)

- unit_id (UUID, PK), product_id (FK product_master)

- serial_number, batch_number, manufacturer_user_id (FK users)

- data_hash, current_status, current_location, is_sold, created_at

- unique (product_id, serial_number)

- Rule: GTIN is never used as the unit ID.

## supply_chain_events

- event_id (PK), unit_id (FK product_unit)

- event_type: REGISTERED | TRANSFERRED | RECEIVED | LOCATION_UPDATE | SOLD

- actor_user_id (FK users), seller_id (FK sellers), location, note, created_at

## chain_transactions

- tx_id (PK), event_id (FK supply_chain_events)

- tx_hash (unique), network (default sepolia), block_number

- tx_status: PENDING | CONFIRMED | FAILED, created_at

## scan_logs

- scan_id (PK), unit_id (FK product_unit), scanned_by_user_id (FK users)

- result: AUTHENTIC | SUSPICIOUS | UNVERIFIED

- reason, scan_location, scanned_at

## Conventions

- GTIN/barcodes are TEXT so leading zeros are kept.

- Timestamps are TIMESTAMPTZ.

- Dataset files use the product_master field names above.

