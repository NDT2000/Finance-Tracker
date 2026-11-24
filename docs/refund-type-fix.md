# Refund transactions on older databases (Flyway V7)

## Problem

Databases first created by Hibernate's `ddl-auto=update`, before Flyway managed the schema, contain an
auto-generated constraint:

```sql
transactions_type_check CHECK (type IN ('INCOME', 'EXPENSE'))
```

`REFUND` was added to `TransactionType` later. Flyway never created this constraint, so no migration
updated it, and those databases rejected every refund with `409 Request conflicts with existing data`.
Because CSV imports commit atomically, one refund row made a whole import fail
(`JOB_EXECUTION_ERROR`), for example `pipeline/data/product/01-expenses.csv`.

Databases built from `V1` never had the constraint, which is why the PostgreSQL integration tests
(fresh Testcontainers databases) did not catch it. This is **schema drift**: two databases with the same
migration history but different actual schemas.

## Fix

`V7__allow_refund_transaction_type.sql` drops the constraint if it exists and adds one matching the enum
(`INCOME`, `EXPENSE`, `REFUND`), so old and new databases end up identical. Existing rows are unchanged.

`RefundTypeMigrationTest` recreates the legacy constraint on PostgreSQL 15, migrates, and checks that a
refund is accepted, unknown types are still rejected and existing rows survive. `SessionMigrationTest`
now expects six migrations after the V1 baseline.

## Applying it to an existing database

Follow the usual verified-backup procedure first (see [operations](pipeline/operations.md)):

```bash
docker compose stop backend
DB_ADMIN="$(docker exec finance-db sh -c 'printf "%s" "$POSTGRES_USER"')" \
  BACKUP_DIR="$HOME/finance-tracker-backups" bash pipeline/backup.sh
docker compose up -d --build backend
```

Flyway applies V7 at startup. A previously failed import can then be re-run from **Import Transactions →
View results → Re-evaluate / retry**.

Applied to the local development database on 2026-11-24: backup restore verified, V7 applied, and the
users/transactions/budgets content digests were identical before and after. The failed sample import
then completed with its one intentionally rejected row.

## Running the PostgreSQL tests with Docker Engine 29

Docker Engine 29 rejected the API version Testcontainers 1.21.3 requested (it answered
`Status 400` with an empty body, reported as "Could not find a valid Docker environment").
Testcontainers 1.21.4 fixes this, so since 2026-11-24 the tests run without a workaround:

```bash
cd finance-tracker
./mvnw -B verify
```
