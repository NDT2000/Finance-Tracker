#!/usr/bin/env bash
# Run before provisioning. Uses the existing PostgreSQL container's local admin access.
set -euo pipefail
umask 077
: "${DB_CONTAINER:=finance-db}"
: "${DB_ADMIN:=nayan}"
: "${DB_NAME:=financedb}"
: "${BACKUP_DIR:?Set BACKUP_DIR to a private directory outside the checkout}"
mkdir -p "$BACKUP_DIR"
backup="$BACKUP_DIR/day1-$(date -u +%Y%m%dT%H%M%SZ)-$$"
verify_db="pipeline_backup_verify_$$"
created=false
cleanup() {
  if "$created"; then docker exec "$DB_CONTAINER" dropdb -U "$DB_ADMIN" "$verify_db"; fi
}
trap cleanup EXIT
# Full database backup; globals include password hashes and must remain private.
docker exec "$DB_CONTAINER" pg_dump -U "$DB_ADMIN" -d "$DB_NAME" -Fc > "$backup.dump"
docker exec "$DB_CONTAINER" pg_dumpall -U "$DB_ADMIN" --globals-only > "$backup.globals.sql"
docker exec -i "$DB_CONTAINER" pg_restore --list < "$backup.dump" > "$backup.list"
docker exec "$DB_CONTAINER" createdb -U "$DB_ADMIN" "$verify_db"
created=true
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_ADMIN" -d "$verify_db" --exit-on-error < "$backup.dump"
sql="SELECT 'users',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,',' ORDER BY id),'')) FROM public.users t UNION ALL SELECT 'transactions',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,',' ORDER BY id),'')) FROM public.transactions t UNION ALL SELECT 'budgets',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,',' ORDER BY id),'')) FROM public.budgets t;"
docker exec "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$DB_ADMIN" -d "$DB_NAME" -Atc "$sql" > "$backup.live-check"
docker exec "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$DB_ADMIN" -d "$verify_db" -Atc "$sql" > "$backup.restored-check"
diff -u "$backup.live-check" "$backup.restored-check"
printf 'Verified full restore and unchanged application rows: %s.dump\n' "$backup"
