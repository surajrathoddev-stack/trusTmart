\# Database Setup (trusTmart)



\## Requirements

\- PostgreSQL 18 (or 14+)

\- Git Bash (Windows) or any bash shell

\- `psql` available on your PATH



\## Steps

1\. Clone the repo and open the `avika-database` branch.

2\. Create an empty database named `trustmart` (pgAdmin, or `createdb trustmart`).

3\. Copy the example settings file and put your own password in it:

&#x20;  `cp database/.env.example database/.env`

&#x20;  Never commit `database/.env`. It is ignored by Git.

4\. Apply all migrations with one command:

&#x20;  `bash database/scripts/migrate.sh`

5\. Check the tables:

&#x20;  `psql -h localhost -U postgres -d trustmart -c "\\dt"`



\## Notes

\- The script is safe to run again. Migrations already applied are skipped.

\- Applied migrations are recorded in the `schema\_migrations` table.

\- GTIN/barcodes are stored as text so leading zeros are kept.

\- A product unit has its own `unit\_id`. The GTIN is never used as a unit ID.

