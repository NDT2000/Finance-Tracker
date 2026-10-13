# Financial planning

Open **Dashboard → Financial planning** to create a saved what-if scenario. Set its currency, starting month, horizon (1–36 months), opening cash, opening investments, cash reserve, and optional annual investment return. These are assumptions you supply; bank balances are not automatically inferred.

Add up to 200 events, either once or monthly over a selected range:

| Event | Effect |
| --- | --- |
| Salary / other income | Adds cash |
| Spending | Reduces cash |
| Investment contribution | Moves cash into investments |
| Loan repayment | Reduces cash |
| Investment withdrawal | Moves available investments into cash |

You can edit assumptions and events, delete events or scenarios, and copy a scenario to compare alternatives. Copies contain independent events. The chart and monthly table show projected cash and investments. Funding checks identify negative month-end cash, cash below the reserve, and withdrawals that cannot be funded. A selected recorded month provides an owner-scoped, same-currency reference; its transactions are not automatically repeated in the projection.

## Calculation and limits

Each month applies income, spending, repayments and contributions. Contributions become available before withdrawals. Withdrawals are capped at the available investment balance; any unfunded amount is reported and does not become cash. Growth then applies to remaining investments using annual percentage / 12, rounded each month to the currency's minor units with half-even rounding.

Closing cash = opening cash + income + funded withdrawals − spending − repayments − contributions.

Closing investments = opening investments + contributions − funded withdrawals + investment growth.

Contributions and withdrawals are transfers, so they are not counted again as spending or income. Growth changes investment value, not cash. Money uses exact Java `BigDecimal` and decimal strings in API responses; USD allows two decimal places and JPY zero. Chart positions use browser numbers for display only. Each scenario has one currency; there is no exchange-rate conversion.

Loan repayments model cash outflow, not amortization or remaining debt. Returns are assumptions, not market forecasts; taxes, fees, intra-month timing and portfolio composition are outside this version. Warnings evaluate monthly closing balances, not daily liquidity. Planning never moves money or creates actual transactions.

## Hand-reconciled example

Start with USD 1,000 cash, USD 500 investments, reserve USD 600, three months and 0% return. Each month add salary 2,000, spending 1,200, investment contribution 300 and loan repayment 400. Add a one-time withdrawal of 200 in month 2.

| Month | Closing cash | Closing investments | Combined value |
| --- | ---: | ---: | ---: |
| 1 | 1,100.00 | 800.00 | 1,900.00 |
| 2 | 1,400.00 | 900.00 | 2,300.00 |
| 3 | 1,500.00 | 1,200.00 | 2,700.00 |

If a withdrawal asks for 150 while only 100 is available, cash receives 100 and the funding check reports 50 unfunded.

## Data flow and concepts

React sends authenticated scenario/event requests to `/api/plans`. Spring validates ownership, currency precision and event ranges, then persists separate `financial_plans` and `plan_events` tables. A projection reads a consistent snapshot and calculates the monthly series; it reads existing analytics only for the recorded-month reference. Actual ledger/import/forecast behavior stays separate.

The key concepts to learn are authenticated owner-scoped CRUD, relational foreign keys and Flyway migrations, exact decimal arithmetic, recurring event expansion, transfer versus expense accounting, transactional snapshots and serialized writes, and testing calculations against a hand-worked example.

Flyway V6 adds the two planning tables after existing migrations. Hibernate continues to validate the schema. Owner-scoped lookups return 404 for another user's resources. Writes lock the owner's row to serialize related edits; projections use repeatable-read isolation. Deleting a scenario deletes its events, with no effect on the actual ledger.

## Start and verify locally

Use the existing ignored `.env` and Docker Compose configuration; do not change credentials for an existing PostgreSQL volume. Before the first V6 upgrade, stop application writes and take a verified backup outside git:

```bash
docker compose stop backend
docker compose up -d db
DB_ADMIN="$(docker exec finance-db sh -c 'printf "%s" "$POSTGRES_USER"')" \
  BACKUP_DIR="$HOME/finance-backups" bash pipeline/backup.sh
docker compose up -d --build
```

The backup helper restores into a temporary database, verifies application-row digests, and removes only that verification database. Preserve the dump and globals file privately. Do not delete the `postgres_data` volume. After startup, sign in and open Financial planning from the dashboard.

For development checks:

```bash
cd finance-tracker
./mvnw verify
cd ../frontend
npm ci
npm test
npm run build
```

Backend integration tests require Docker for PostgreSQL 15 Testcontainers.

## Verification performed

- 108 backend tests passed, including nine PostgreSQL/Flyway planning integration tests covering all five events, exact arithmetic, currency rules, growth, warnings, independent copies, validation, authentication and cross-owner access.
- Eight frontend tests and the production build passed.
- A real Chromium journey created all five event types, reconciled the example, reloaded saved scenarios, edited an independent copy, exercised funding warnings, deleted a copy, checked a 375px screen and verified actual transactions were unchanged.
- Before applying V6 to the isolated development database, a full backup was restored and selected existing-table counts/content digests compared. Those digests were unchanged immediately after V6. This does not verify or upgrade your local or production database; run the backup steps there before upgrading.
