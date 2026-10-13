# Bank-linked transactions and CSV reports

## Use the feature

1. Add named bank accounts in **My profile → Bank accounts**. Each account has a currency.
2. On the dashboard, select a currency, then **Add Transaction**. The **Bank account** selector offers your accounts in that currency, plus **Unassigned**. Expenses and income retain the selected account. No bank login or connection is needed.
3. A refund uses its original expense's bank account automatically; it cannot target a different account. Existing refund amount/category/currency limits still apply.
4. **Recent Transactions → Assign account** can associate a displayed manual or imported expense/income with an account, or clear that assignment. All its linked refunds follow, including excluded refunds that may later be restored. Amounts, import identity and immutable source files do not change.
5. **Download transactions** offers all three types or expenses/refunds/income separately, all dates or the selected month, all currencies or the selected currency, and all accounts or one saved account. **Download CSV report** downloads only your active canonical ledger entries.

Adding or assigning a bank does not automatically reconcile a bank balance. Dashboard budgets, monthly totals and forecasting still use the same canonical ledger and currency rules. Bank accounts in another currency are not converted automatically.

## Existing data and deletion

Flyway V5 adds nullable `bank_account_id` and a historical `bank_account_name` snapshot to transactions. The account ID is a real foreign key to the existing financial_accounts table; the import `account_ref` remains a separate source identity namespace. V1–V4 are unchanged and Hibernate remains `validate`.

Existing transactions remain unassigned; the migration does not guess an account or change amounts. New CSV imports are also unassigned unless explicitly linked to an already assigned manual event or assigned afterwards. Imported refunds inherit their original expense's account; higher source revisions preserve the assigned bank and are rejected if their currency would conflict with it. No bank is inferred from CSV filenames or free-form source account references.

Deleting a saved bank entry sets its transaction account IDs to null while retaining the historical account name. Its transactions, refunds, source identities and totals remain. All-account reports retain those labels; a deleted account is no longer offered for new assignments or account-specific filtering. Explicitly unassigning a transaction clears its label and propagates that change to its refunds.

The old PUT transaction API replaces transaction fields, including optional bankAccountId; clients should send their intended assignment. Prefer the bank-only endpoint when changing just this metadata, especially on imported entries or expenses with refunds.

## CSV report contract

`GET /api/transactions/export` is authenticated. Optional query parameters:

| Parameter | Meaning |
| --- | --- |
| `month=2026-10` | One calendar month; omitted means all dates |
| `currency=USD` | One supported uppercase ISO currency; omitted means separate rows for every currency |
| `type=EXPENSE`, `REFUND` or `INCOME` | One type; omitted means all three |
| `bankAccountId=123` | One account owned by the signed-in user; omitted means all assigned/unassigned/historical accounts |

Owner/deleted/date/currency/type/bank filters execute in the database. CSV rows sort by date and ledger ID. Foreign or nonexistent account filters return 404; bad filters return 400. The response is a UTF-8 RFC 4180 attachment with `Cache-Control: no-store`.

Columns: `id,date,description,category,type,amount,currency,bank_account_id,bank_account_name,refund_of,origin,source_transaction_id`.

Amounts are exact plain decimal text. Refund amounts stay positive; use the type to subtract them from expenses. Currency codes accompany every amount; do not sum different currencies together. Quotes, commas and embedded newlines are escaped. A leading apostrophe protects text that could be interpreted as a spreadsheet formula, without changing stored values.

This is a report, not the batch-upload contract: it includes ledger IDs, account metadata and canonical refund references. Do not re-upload it as a bank export. Bank credentials, account numbers, user email and password are not included.

`PUT /api/transactions/{id}/bank-account` accepts `{ "bankAccountId": 123 }` or null to unassign. Ownership and currency are checked, and related refund assignments update atomically under the same owner lock used by imports/manual changes.

## Start and validate

Before the first upgrade of an existing database, use the existing backup procedure with the actual database administrator:

```bash
# Existing ignored .env must contain your existing DB credentials.
# Applies only to an existing application database; skip backup for a fresh empty DB.
docker compose up -d db
DB_ADMIN="$(docker exec finance-db sh -c 'printf "%s" "$POSTGRES_USER"')" \
BACKUP_DIR="$HOME/finance-tracker-backups" bash pipeline/backup.sh
# After the verified restore succeeds:
docker compose up -d --build
```

Do not delete the named postgres_data volume or replace its credentials. The private local demo was backed up before V5, restored separately, and user/transaction/account/import counts plus content digests matched. After V5 those digests still matched when ignoring the two newly added null transaction fields. Shared/production databases were not changed.

Checks: 99 backend tests passed (eight new PostgreSQL/Flyway/validate tests for this feature), eight frontend tests and production build passed. The actual browser exercised bank selection, inherited refunds, assignment changes, downloads/filters, deletion preservation, unchanged totals and a 375px mobile layout. CSV files from those downloads were independently parsed to verify row counts, types, bank names and exact amounts.
