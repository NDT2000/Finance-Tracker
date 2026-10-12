# Verification evidence

Checked on 2026-10-12, from main `4d40332` on `feat/reliable-batch-pipeline`. Results are local execution evidence; production and GitHub CI were not exercised.

- Baseline: existing 77 backend tests passed; live original API/ML demo reproduced. Before V4 a full PostgreSQL custom-format dump was restored into a separate database, with 3 transactions summing to 1030.00. After V4 the same original user's 3 rows still sum to 1030.0000. The amount scale widened; values did not change. Shared/production data untouched.
- Final backend: **85 tests passed, zero failures/errors/skips**, including eight new PostgreSQL 15/Flyway/validate import integration tests. They cover golden sample/repeat and overlap, eight simultaneous uploads and two workers, injected mid-batch rollback/retry, lease recovery/exhaustion/stale claims, precision/conflicting revisions/refund limits, missing identity/dependency recovery/self-reference, retained exclusions/restore/JPY, authenticated routes and cross-owner denial.
- Frontend: **8 existing auth-client tests passed**, production build passed. Actual Chromium against the running API (no route mocks) passed login, USD/EUR selection, September/October summaries, repeated upload notice, exact original download, missing-ID review/ignore, and desktop/mobile imports/dashboard checks at 375px with no page errors or page overflow.
- ML: **3 tests passed** for unchanged positive daily projection, refund-only month/zero lower bound, and refund-aware net regression.
- Day 1: **3 Python importer tests passed**; product CLI and benchmark generator compile. The legacy synthetic pipeline was retained.
- Actual API + scheduled worker: the sample linked the manual Coffee, corrected Groceries, resolved the refund, retained the invalid row, and reconciled every total in [model](model.md). Exact repeats kept the same batch IDs, 5 USD/1 EUR entries and totals. Downloaded source bytes matched exactly. Current Food forecast received USD net spending 35.00, consistent with the hand reconciliation.

## Measured dataset

`pipeline/generate_benchmark.py` deterministically produces 1,000 distinct USD 1.00 expenses dated 2026-09-01, account namespace `benchmark`. This is synthetic, separate from the hand sample and existing demo user.

```bash
python3 pipeline/generate_benchmark.py /tmp/benchmark-1000.csv
python3 pipeline/import_product.py /tmp/benchmark-1000.csv --account benchmark
# Repeat this exact command; expect repeated=True and unchanged totals.
```

| Measurement | Observed |
| --- | --- |
| CSV records / bytes | 1,000 / 54,845 |
| SHA-256 | `6da6b8d6288d8e4a28dc282baf85287dc734a2b4849f8bd504fd77eef09fde6d` |
| API upload-to-observed completion | 5.108 seconds (includes 1-second polling) |
| Server processing duration | 3,592 ms |
| Approximate processing throughput | 278 rows/second |
| September canonical count / net expenses | 1,000 / USD 1,000.00 |
| Authenticated Python CLI repeat | Completed, repeated=True, unchanged count and total |

Single local run on this cloud workspace, Java 17/PostgreSQL 15. This is not a concurrency/load benchmark or a production SLA. A review action is measured separately from processing; the sample's later review updates its result metadata.

## Limits and separate release gates

No live production restore, deployment, production capacity/retention policy or upstream freshness guarantee is verified. Stable source IDs enable automatic overlapping-export identity; unidentified overlaps require review. No FX or financial-account balance calculation is implemented. Existing main ruleset enforcement is not independently verified here. The previously identified historical JWT literals still require review/rotation; the history scan is deliberately not suppressed. NVD dependency scanning requires the repository's `NVD_API_KEY`. Passing functional tests does not bypass either release gate.
