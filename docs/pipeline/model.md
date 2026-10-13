# Canonical ledger and reconciliation

Manual entries and imported events share `public.transactions`; raw source rows are provenance, never a second additive fact table. Summaries select active records by authenticated owner, full month boundaries and one currency. Income, gross expenses, refunds, net expenses and net savings are computed with BigDecimal and returned as decimal strings. Chart coordinates and ML regression use floating point only for presentation/prediction, not accounting. Summary and import-freshness reads share a repeatable-read snapshot.

## Identity and changes

1. Owner + account reference + source ID identifies an event across overlapping exports. Equal revision/equal normalized payload is DUPLICATE; older is STALE; same revision/different payload is rejected; higher revision corrects the same ledger ID. Every old file/row remains traceable to it. Corrections can change financial fields only while refund constraints remain valid.
2. Without stable IDs there is no safe automatic identity across exports. Every unidentified row requires review, even without candidates. Confirming it creates a file-content-hash + record identity; exact reruns stay safe. Overlapping unidentified exports require human review; no claim of automatic deduplication is made.
3. An exact owner/date/currency/type/amount/category/description match is a review candidate, not proof of identity. Link attaches the source identity to that existing event without adding another amount. Keep as distinct creates another event intentionally. Ignore preserves the source row without promotion. A separate stable source ID cannot silently replace another stable event ID; a file-only confirmed alias can be linked to its later identified source event.
4. A refund references an active expense owned by the same user, in the same currency/category. Active refund sums cannot exceed that expense. Process expenses/income before refunds; a missing parent is rejected and may be re-evaluated once a predecessor export arrives. Self-references are forbidden. Refunded expenses cannot be corrected into an incompatible category/currency/type or a smaller amount than their refunds.
5. Exclusion is a retained tombstone: retries/corrections do not resurrect it. Exclude refunds before excluding their original purchase. Owner-scoped POST `/api/transactions/{id}/restore` explicitly reactivates and revalidates a record. Imported/linked financial edits require a higher source revision; manual entries remain editable. Zero-amount cancellation is outside the CSV contract; use exclusion/restore.

Existing transactions/budgets become USD because the former application used dollar labels without currency metadata. This is a compatibility assumption, not inferred historical FX. Check historical currency correctness before using production reports. Forecasting keeps the existing current-month category behavior, now scopes currency and active entries and sends refunds as negative spending; income and raw rows stay excluded. Historical-month dashboards do not present current-month forecasts as historical predictions.

## Reconcile by hand

Create manual Coffee USD 10.00 on 2026-10-03, Food. Upload `01-expenses.csv` in account `sample`, link Coffee to that manual entry, then upload `02-corrections.csv`.

| Event | Final USD amount | Treatment |
| --- | ---: | --- |
| Coffee | 10.00 | One linked expense, repeated source ignored |
| Groceries | 35.00 | Revision 2 replaces 30.00 in the same entry |
| Bus | 5.00 | New expense |
| Grocery return | 10.00 | Refund subtracts spending |
| Salary | 100.00 | Income |
| Invalid `oops` | 0 counted | Rejected, retained original |

USD: gross 50.00, refunds 10.00, net expenses 40.00, income 100.00, net savings 60.00; 5 active entries. Food net 35.00, Transport 5.00. EUR: train 7.50, one separate entry. Repeat both files: batch IDs, canonical counts and all totals unchanged. No combined USD/EUR total is defined. Net savings is a monthly flow, not a bank balance.
