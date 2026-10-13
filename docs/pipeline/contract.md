# CSV and import contract

- UTF-8 (optional BOM), RFC 4180 quoting; exactly one header, case-sensitive names, no duplicate or unknown columns. Logical record numbers start at 1 after the header, including quoted multiline records.
- Maximum 2 MiB, 5,000 records; empty files/headers-only files fail. Malformed encoding/CSV/header or row-limit failure rejects the whole job, with zero promotions. Valid CSV with bad individual rows promotes valid rows and preserves rejected rows for review/download.
- Required: `date,category,description,amount,currency`. Optional: `type,source_transaction_id,revision,refund_of`. Whitespace is trimmed for normalized values; original bytes and row field values remain stored.
- `date`: ISO `YYYY-MM-DD`; category 1–100 characters, description 1–255.
- `amount`: plain positive decimal, no sign/grouping/exponent, at most four input decimal places, value below 10^15. Currency minor-unit precision is enforced without rounding (USD 2, JPY 0, KWD 3). Trailing zeroes do not change identity. Negative amounts, zero and unsupported precisions are rejected.
- `currency`: uppercase three-letter Java ISO currency code, with supported minor units 0–3. No currency inference or exchange-rate conversion.
- `type`: `EXPENSE` (default), `INCOME`, `REFUND`. Refund amounts are positive and reduce spending in their own date's month.
- `source_transaction_id`: stable ID within this owner/source-account namespace, at most 100 characters. `revision`: positive integer, default 1. Higher revisions require an ID. `refund_of`: original expense source ID in the same namespace; required with an independently identified REFUND and forbidden for other types.
- Account reference: 1–80 letters, digits, `_`, `-`, `.`. It is a source namespace, not a financial-account balance or account foreign key. Keep it stable across exports; changing it intentionally changes identity scope.

POST `/api/imports` is authenticated multipart (`file`, `accountRef`), returns 202 with batch ID, status and `repeated`. Exact content SHA-256 + owner + account is a unique batch; filename is display metadata. Upload returns after durable source storage, before worker processing. Concurrent repeats return the same batch. Uploaded-file percentage and job completion are different signals; processing is atomic, so the UI reports its stage rather than an invented row percentage.

GET `/api/imports` pages history (50, `offset`); GET `/{id}` includes stage, attempts, outcome counts, error, timestamps and duration; GET `/{id}/rows` pages 100 records (`offset`, `rejectedOnly=true`); GET `/{id}/source` downloads exact original bytes. All endpoints scope ownership and conceal other owners' batches with 404. Rejected JSON includes original fields and a useful validation message; source/report downloads are private financial data.

POST `/{id}/retry` queues terminal jobs for re-evaluation without discarding provenance or successful outcomes. POST `/{id}/rows/{record}/review` accepts `LINK` with `transactionId`, `KEEP_BOTH`, or `IGNORE`. It only accepts pending-review rows and validates ownership and financial equivalence before linking. The UI offers only exact matching candidates; an explicit decision is needed before a potential duplicate affects totals.

Statuses: QUEUED → PROCESSING → COMPLETED, COMPLETED_WITH_REJECTIONS, NEEDS_REVIEW or FAILED. A valid batch with review rows is NEEDS_REVIEW even if it also has rejections. Outcomes: PROMOTED, CORRECTED, LINKED, DUPLICATE, STALE, REJECTED, NEEDS_REVIEW, IGNORED. Original row values are immutable; pending outcomes may change on explicit review/retry. Exact-file re-upload alone does not reprocess.
