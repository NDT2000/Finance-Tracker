# Reliable product pipeline (phases 0–4)

The product now has one canonical ledger: `public.transactions`. Authenticated manual entries and reviewed/imported entries feed that ledger; dashboard, budgets and forecasting read it. The separate Day 1 synthetic `raw.expenses` demo remains available but is deliberately excluded from product totals.

For a learning-focused walkthrough, application feature list and technical concept map, see [the project learning guide](../learning-guide.md).

## What is implemented

| Phase | Delivered | Evidence |
| --- | --- | --- |
| 0 | Inspect existing main, reproduce API/ML demo, verified pre-migration backup restore | [Baseline](baseline.md) |
| 1 | Durable uploads, owner/account/file identity, status/history, immutable source and row outcomes, rejection download, concurrency and recovery | [Contract](contract.md), PostgreSQL tests |
| 2 | Stable source IDs, corrections/refunds, explicit overlap review, exact currency amounts, owner/month/category summaries | [Model](model.md), hand reconciliation |
| 3 | Authenticated CSV upload, upload progress, processing status, results/history/downloads, dashboard month/currency and freshness | Real browser and API checks |
| 4 | PostgreSQL queue, explicit promotion dependencies, bounded retries/leases, sequential backfill CLI, freshness/logs/duration and measured dataset | [Operations](operations.md), [verification](verification.md) |

## Run the demo

Reuse the existing ignored `.env` and Compose installation. Before starting the upgraded backend against any existing database, back up and verify a restore (see operations). Flyway applies V4; Hibernate remains `validate`. Keep the named `postgres_data` volume. Never use `down -v`.

```bash
# From the repository root, after the verified backup:
docker compose up -d --build
# For localhost development the existing dev overlay adds loopback bindings:
# docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Sign in, open **Batch imports**, use source account `sample`, and upload `pipeline/data/product/01-expenses.csv`. It contains an intentionally rejected row. To reproduce the manual-overlap example, first add Coffee, USD 10.00, Food, 2026-10-03 in the dashboard; link its candidate in the import review. Upload `02-corrections.csv` next. Select October 2026 and USD in the dashboard. Repeat both uploads: the same import IDs, counts and totals remain.

For a fully automatic file, give each event a stable `source_transaction_id`; missing IDs require a decision. The exact CSV contract and model limitations are documented below. No new cloud services, orchestration framework or streaming components were added.

Data flow: authenticated upload → committed source bytes + queued job → strict CSV validation → owner-serialized identity/review/refund checks → atomic canonical ledger + row outcomes → currency-scoped monthly summaries and existing ML forecasting. The scheduler is the backend's simple polling task.
