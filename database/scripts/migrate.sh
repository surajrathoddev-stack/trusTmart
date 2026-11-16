#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
source "$ROOT/.env"
set +a
export PGPASSWORD="$DB_PASSWORD"
PSQL=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());"

for f in "$ROOT"/migrations/*.sql; do
  name="$(basename "$f")"
  already="$("${PSQL[@]}" -t -A -c "SELECT 1 FROM schema_migrations WHERE filename='$name';")"
  if [ -n "$already" ]; then echo "skip   $name"; continue; fi
  echo "apply  $name"
  "${PSQL[@]}" -1 -f "$f"
  "${PSQL[@]}" -c "INSERT INTO schema_migrations (filename) VALUES ('$name');"
done
echo "All migrations applied."