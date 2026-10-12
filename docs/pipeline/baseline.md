# Phase 0 evidence

Baseline main: `4d40332` (profile already merged). Existing source inspected; no completed feature rebuilt.

- Existing backend suite: 77 tests passed; Flyway V1–V3 and PostgreSQL/Redis integration retained.
- Actual isolated PostgreSQL 15 + Redis + Java API + Python ML demo: registration, authenticated transaction creation/listing, budget creation, profile retrieval, forecast all succeeded.
- Demo: income USD 1000.00, expenses USD 30.00, net USD 970.00; 3 canonical transactions, 1 budget. Food forecast ON_TRACK, projected 77.81.
- Before V4: full custom-format dump restored successfully in separate `baseline_restore`; 3 transactions sum to 1030.00. Private dump is `/workspace/.finance-env/pipeline-demo/before-v4.dump`, outside Git.
- Shared application database and production deployment untouched.
- Original dashboard aggregates all returned records, fixed dollar labels, day numbers across months. Day 1 synthetic CSV importer is separate, with no product upload/history path. These are the remaining gaps addressed by phases 1–4.
