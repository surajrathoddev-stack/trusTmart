# Completion Report: Database and Product Catalogue (Avika, Module 02)

Branch: avika-database. Updated: 2026-11-16.

## Completed deliverables
- Shared schema contract: docs/SCHEMA_CONTRACT.md (9 tables).
- Version-controlled migrations: database/migrations/001 and 002. GTIN stored as text. Unit id is separate from GTIN.
- One-command setup: bash database/scripts/migrate.sh (safe to rerun). Guide: database/DB_SETUP.md. Safe database/.env.example (no secrets).
- Cosmetics dataset: 100 real records from Open Beauty Facts, with cleaning script and rejected-records report.
- Automotive dataset: 51 verified real records (8 from Open Products Facts after manual review, 43 from official manufacturer pages: NGK 1, Motul 42), with cleaning script, exclusion list and rejected-records report. Target of 50 reached.
- Repeatable import: bash database/scripts/seed.sh. Rerun inserts 0 duplicates. Result on 16 Nov: Automotive 51 in file, 40 newly inserted, Cosmetics 100 in file, 0 inserted. Database total 151.
- Consolidated catalogue: rebuilt with python database/scripts/build_catalogue.py from all database/data/*_clean.csv files. 151 records (Cosmetics 100, Automotive 51), 0 duplicates skipped.
- Documents: DATA_DICTIONARY.md, DATA_SOURCES.md (source and licence register, counts, known gaps, licence recheck of 11 Nov 2026).
- Clean-clone test: passed on 9 Nov (100 Cosmetics, 8 Automotive). It must be run again after all datasets are loaded.

## Known limitations (honest status)
- The 300 record minimum is not met. The catalogue has 151 records in 2 of 6 domains.
- Pharmaceuticals (60 rows) and FMCG (51 rows) files were received on Ruchita's branch (commit e01cab3). They are not imported yet: 33 Pharmaceuticals rows and 18 FMCG rows repeat brand and product name, and the importer rejects such repeats. Ruchita was asked to fix them.
- Electronics and Apparel datasets have not been received.
- 42 of the 51 Automotive records are Motul, so the domain is mostly one brand. Official sites that show a part number and a barcode for each product are rare.
- The backend schema in src/models/init.js on main differs from the contract (UUID ids, users.id, product_units, seller_evidence). The final schema is still to be decided with Suraj.
- 35 further valid Cosmetics records were available and not used (limit of 100 per domain).

## How to add the missing domains
Copy each file as database/data/<domain>_clean.csv with the field names from DATA_DICTIONARY.md, then run: bash database/scripts/seed.sh, then python database/scripts/build_catalogue.py.
