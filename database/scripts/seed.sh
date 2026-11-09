#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
source "$ROOT/.env"
set +a
export PGPASSWORD="$DB_PASSWORD"
cd "$ROOT/data"

for f in *_clean.csv; do
  echo "== $f"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q <<SQL
CREATE TEMP TABLE stg (gtin text, product_name text, brand text, domain text,
  description text, model_part_number text, regulatory_id text,
  source_name text, source_url text, source_record_id text, collected_at text);
\copy stg FROM '$f' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
WITH ins AS (
  INSERT INTO product_master (gtin, product_name, brand, domain, description,
    model_part_number, regulatory_id, source_name, source_url,
    source_record_id, collected_at)
  SELECT NULLIF(s.gtin,''), s.product_name, s.brand, s.domain,
    NULLIF(s.description,''), NULLIF(s.model_part_number,''),
    NULLIF(s.regulatory_id,''), s.source_name, NULLIF(s.source_url,''),
    NULLIF(s.source_record_id,''), NULLIF(s.collected_at,'')::date
  FROM stg s
  WHERE NOT EXISTS (
    SELECT 1 FROM product_master p
    WHERE (s.gtin <> '' AND p.gtin = s.gtin)
       OR (p.brand = s.brand AND p.product_name = s.product_name
           AND p.source_name = s.source_name))
  ON CONFLICT DO NOTHING
  RETURNING 1)
SELECT (SELECT count(*) FROM stg) AS rows_in_file,
       (SELECT count(*) FROM ins) AS inserted;
SQL
done

echo "== Totals by domain"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q \
  -c "SELECT domain, count(*) FROM product_master GROUP BY domain ORDER BY domain;"