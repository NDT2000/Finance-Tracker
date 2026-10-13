# Operating the batch pipeline

## Migration and backup

V4 follows the application's Flyway conventions. V1–V3 checksums are unchanged; Hibernate stays `validate`. V4 adds import history/identity tables and currency/provenance/exclusion fields; it widens existing amounts without rounding or dropping rows. Application uploads use authenticated application services and the existing application DB role. The Day 1 restricted pipeline role still accesses only its isolated raw/analytics schemas; do not grant it application tables.

Before deploying against an existing database, quiesce application writes and verify a backup restore. Reuse the existing private `.env`; do not change credentials for an existing volume.

```bash
# From root, with existing Compose credentials loaded; store backups outside Git:
BACKUP_DIR="$HOME/finance-tracker-backups" DB_CONTAINER=finance-db bash pipeline/backup.sh
# Only after this succeeds, rebuild/start backend with V4:
docker compose up -d --build
```

The repository backup script verifies application row counts/content digests in a temporary restored database and removes only that temporary DB. It never overwrites the original. Ensure backup permissions and retention protect private data; verify restore again for production. New import/provenance tables are included in the full pg_dump; the existing script's comparison covers its listed application tables. No production migration or backup was performed in this task. Local evidence applies only to the isolated PostgreSQL 15 demo.

## Dependencies, retries, recovery

A backend scheduled task polls the durable PostgreSQL queue every 1 second by default. `PIPELINE_WORKER_ENABLED=false` disables this instance's polling; `PIPELINE_POLL_MS` changes cadence. No external scheduler/framework is required. Source commit precedes claim; parse precedes promotion; expense/income promotion precedes dependent refunds; validation, canonical writes, identity/row results and batch completion commit together.

Claims use `FOR UPDATE SKIP LOCKED`, unique claim tokens and 10-minute leases across instances. Writers lock the owner row before the batch, serializing manual edits, promotion and overlap decisions for that owner. An exception rolls back the entire processing transaction; the durable source survives. Retryable execution errors are scheduled with bounded backoff (10 then 20 seconds), up to three automatic attempts. Expired claims are recovered; exhausted jobs become FAILED. An old claim cannot overwrite its replacement. Source format errors do not automatically retry. Explicit retry starts a new three-attempt window, preserving successful/ignored/stale outcomes and re-evaluating rejects/review rows. Invalid immutable bytes require a corrected new file, not an endless retry.

The two-sample backfill deliberately needs review; complete the manual Coffee link before correction/refund dependencies. For a folder of already contracted files, the CLI sorts filenames, uploads and waits sequentially. Use numbered names for dependencies. Across files, a missing refund parent is rejected; import its predecessor and explicitly re-evaluate the dependent job.

```bash
# Credentials must already be securely exported, never pasted into this command:
# FINANCE_EMAIL, FINANCE_PASSWORD (or FINANCE_ACCESS_TOKEN).
# FINANCE_BASE_URL defaults to http://localhost:8080; Compose public API uses http://localhost.
# FINANCE_ORIGIN defaults to http://localhost, must be an allowed origin.
python3 pipeline/import_product.py exports/*.csv --account source-bank --report /tmp/import-results.json
# Resume a known retryable failed job by re-uploading exact bytes:
python3 pipeline/import_product.py exports/01.csv --account source-bank --retry-failed
```

The stdlib CLI keeps tokens/cookies in memory and logs only batch IDs/status/counts. It safely retries a transport upload once and polls for up to 600 seconds (configurable). Exit 0 = all completed, 2 = review/rejection/failure attention or remaining dependent files, 1 = client error. Default stops on attention; `--continue-on-attention` explicitly continues. `--report` stores job metadata, not source bytes; protect reports. After an interrupted client, exact upload finds the durable job rather than creating another.

## Freshness and diagnosis

Dashboard shows query time, latest committed import, and owner-scoped pending/review/failed counts. GET monthly summary also exposes oldest pending time. These describe ingestion state, not proof that an upstream bank export is current. History includes attempt/start/finish/duration and row counts; structured worker logs contain batch/user IDs, status/counts/duration/error type, never CSV contents, emails or amounts. Existing security audit handling remains intact.

Use history/results to distinguish invalid input from recoverable execution errors. Investigate prolonged queue age, FAILED jobs, review queues and unexpected rejection rates; reconcile before retrying or backfilling. No alerting/cloud monitoring was installed. Back up durable source/history with the application database. Retention/erasure policy for private uploads needs deployment-specific decisions; this milestone does not delete historical provenance automatically.

Scale is bounded to small batch files. One instance claims one batch per poll; other owners/replicas can progress separately, while one owner's writers serialize. Measurements are local, not production capacity promises. Add an external scheduling framework only when a demonstrated dependency/scale requirement exceeds this queue and sequential CLI.

## Checks

```bash
(cd finance-tracker && bash mvnw --batch-mode verify)
(cd frontend && npm test && npm run build)
# For Python tests use a venv with both requirements files installed:
# python3 -m venv /tmp/finance-validation
# /tmp/finance-validation/bin/pip install -r pipeline/requirements.txt -r ml-service/requirements.txt
/tmp/finance-validation/bin/python -m unittest discover -s pipeline/tests -v
python3 -m py_compile pipeline/import_product.py
# With the ML dependencies installed:
/tmp/finance-validation/bin/python -m unittest discover -s ml-service -p 'test_*.py' -v
```

Java 17, Docker/Testcontainers PostgreSQL 15/Redis, Node 24 and Python 3 are needed. The saved cloud setup retains Maven proxy/system CA overrides; TLS verification stays enabled. Existing NVD-key and historical-secret review requirements are separate CI gates; this feature does not suppress them or merge main automatically.
