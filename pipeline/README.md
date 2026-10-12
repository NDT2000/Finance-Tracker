# Day 1: synthetic expense CSV → PostgreSQL

This milestone imports one small expense export, then safely repeats that exact file.
It does not import into application users/transactions/budgets or change the frontend.

## Existing database and migrations

The shared `docker-compose.yml` uses `postgres:15`, named volume `postgres_data`,
`financedb`, and container `finance-db`. Database credentials are supplied through
`DB_USERNAME` and `DB_PASSWORD`. The base Compose exposes only Nginx; use
`docker-compose.dev.yml` to bind PostgreSQL to `127.0.0.1:5432` for this local importer.
Local clients connect to `localhost:5432`; the Docker backend uses `db:5432`.
The application uses Flyway V1/V2/V3 migrations and Hibernate `ddl-auto=validate`. The test profile uses H2 with `create-drop`.

The application uses Flyway migrations, including financial accounts and auth sessions.
The separate pipeline setup uses the numbered administrator-only SQL script
`migrations/001_expenses.sql`, applied by `provision.py`; it creates a PostgreSQL
role as well as schemas and is intentionally not run with application credentials.
It does not modify or bypass the application Flyway history. Hibernate settings
and application tables remain unchanged by pipeline setup. Do not use
`create`/`create-drop` against the real application database. The pipeline script
is repeatable for its current definitions; future pipeline changes require new
numbered scripts.

## 1. Install and back up before database changes

From the repository root (Python 3.10+):

```bash
python3 -m venv pipeline/venv
pipeline/venv/bin/python -m pip install -r pipeline/requirements.txt
# Use your existing Compose database; do not down -v or recreate its volume.
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
# Stop application writes briefly while verifying the backup, if necessary.
BACKUP_DIR="$HOME/finance-tracker-backups" DB_CONTAINER=finance-db bash pipeline/backup.sh
```

Compose requires `DB_USERNAME`, `DB_PASSWORD`, `REDIS_PASSWORD`, and `JWT_SECRET`
even when selecting a service; reuse your existing ignored `.env` or securely
exported values. Use the existing database credentials for an existing volume. Do not commit it. The backup script
creates a custom-format dump, a private globals file (including password hashes),
checks the dump listing, restores to a uniquely named temporary database, compares
application row counts and row-content digests, then drops only that temporary
database. It never restores over the source database. Admin must be allowed to
create/drop a temporary database. A restore failure or data mismatch stops the
script: do not proceed until diagnosed. Pause writes if a live change caused the
mismatch. Keep backup files outside the repository and protect them as sensitive.

If PostgreSQL is inaccessible, these steps and the import/permission checks remain
unverified; do not run provisioning until access and a verified backup are available.
`pg_dump` does not back up role definitions, hence the separate globals file.
In a recovery, have the administrator review the globals file and restore into a
new database before considering any replacement of production data.

## 2. Provision with admin access; import with restricted access

No new credentials belong in Git. Scripts read environment variables directly;
they do not load `.env` files automatically. Enter connection information privately
in a Bash terminal (URI or libpq connection string, including your existing admin
credentials):

```bash
read -rsp 'Admin database connection string: ' PIPELINE_ADMIN_DATABASE_URL; echo
export PIPELINE_ADMIN_DATABASE_URL
read -rsp 'New pipeline role password: ' PIPELINE_PASSWORD; echo
export PIPELINE_PASSWORD
pipeline/venv/bin/python pipeline/provision.py
export PIPELINE_DATABASE_URL="$(pipeline/venv/bin/python -c 'import os; from psycopg.conninfo import make_conninfo; print(make_conninfo(host="localhost",port=5432,dbname="financedb",user="finance_pipeline",password=os.environ["PIPELINE_PASSWORD"]))')"
unset PIPELINE_ADMIN_DATABASE_URL PIPELINE_PASSWORD
```

Adjust host/database in the connection construction if your existing setup differs.
Do not enable shell tracing or print these variables. Provisioning runs in one
transaction, validates permissions, and rolls back on failure. Rerunning it with
a new password rotates the pipeline login. Use a unique strong password.

`raw` and `analytics` belong to the administrator, not the importer. The dedicated
`finance_pipeline` role can use these schemas, SELECT/INSERT `raw.expenses`, and
SELECT the monthly view. It cannot UPDATE/DELETE/TRUNCATE, access application
tables or sequences, create persistent schemas/tables, administer roles, or bypass
row security. Existing application grants are left intact. Verification fails if
pre-existing grants or inherited PUBLIC privileges broaden those permissions.
PostgreSQL's standard PUBLIC CONNECT/TEMP and system catalog visibility remain;
this is not a database sandbox. The role has access to all **synthetic** accounts
in the raw table; account identity is an import namespace, not tenant authorization.
Never use this milestone to load real user data.

## 3. Import twice and query

```bash
pipeline/venv/bin/python pipeline/import_csv.py pipeline/data/expenses.csv --account synthetic:day1-demo
pipeline/venv/bin/python pipeline/import_csv.py pipeline/data/expenses.csv --account synthetic:day1-demo
pipeline/venv/bin/python pipeline/verify.py
pipeline/venv/bin/python -m unittest discover -s pipeline/tests -v
# With psql installed, reuse the restricted connection:
psql "$PIPELINE_DATABASE_URL" -v ON_ERROR_STOP=1 -f pipeline/monthly_spending.sql
```

On a fresh account the importer reports `rows=5 inserted=5 already_present=0`,
then `rows=5 inserted=0 already_present=5`. `verify.py` performs real denied
operations in rolled-back transactions, imports twice, and compares counts and
exact totals. If the sample is already imported, both verification imports insert
zero. Keep `synthetic:day1-demo` reserved for the supplied sample; additional files
in that account make the fixed expected-total check fail.

| Month | Currency | Count | Total |
| --- | --- | ---: | ---: |
| 2026-01 | USD | 3 | 42.35 |
| 2026-02 | USD | 2 | 27.65 |

## Data flow and scope

CSV bytes → SHA-256 → validate all rows → one PostgreSQL transaction →
`raw.expenses` → `analytics.monthly_spending` view.

The primary key is `(synthetic_account, file_sha256, row_number)`. Row number is
one-based CSV data-record order (not physical line number for quoted multiline
records). Renaming the file preserves identity; changing any bytes, line endings,
row order, or the account creates a different import identity. The database unique
constraint and `ON CONFLICT DO NOTHING` make identical imports safe even with
concurrent attempts. A validation or database error leaves no partially imported
file. Files are read into memory because this milestone is deliberately small.

Amounts go directly from decimal text to Python `Decimal` to PostgreSQL
`numeric(18,2)`, never through floating point. More than two fractional digits,
nonpositive amounts, exponent notation and out-of-range values are rejected rather
than rounded. Currency is a required uppercase three-letter label; amounts are
grouped by currency with no exchange conversion. This two-decimal sample format
does not implement every currency's minor-unit rules or validate an ISO registry.

**Overlapping exports are outside Day 1.** Two different files containing the same
purchase will count it twice. Content hashes prevent duplicate files, not duplicate
financial events. No cloud services, orchestration, streaming or frontend changes
are included.

## Verification in this workspace

The accessible PostgreSQL 15.19 instance was `finance-onboarding-db` on
`127.0.0.1:5432`, with a workspace bind mount, not the shared Compose named volume.
Before changes, `/workspace/.finance-env/backups/day1-before.dump` was restored into
`pipeline_backup_verify`. Counts matched: one user, one transaction totaling
100.00, one budget. After provisioning/importing, row-content digests for all three
application tables still matched that restored backup. The shared Compose volume
was not accessed or changed. Local Compose behavior must be verified on your own
instance using the commands above.

Verified results: initial import inserted 5 rows; the second inserted 0, with
unchanged January USD 42.35 (3 rows) and February USD 27.65 (2 rows). Reapplying
provisioning and repeating verification also passed. Actual denied operations and
privilege inspection passed. A file with an invalid second row imported nothing;
the same file under another synthetic account imported independently and that
extra verification account's rows were removed afterward. Three CSV unit tests
and all 17 existing backend tests passed. The reusable backup script also passed
an actual full restore check. The running backend still rejects unauthenticated
transaction access with HTTP 401. No existing tracked files were changed.
