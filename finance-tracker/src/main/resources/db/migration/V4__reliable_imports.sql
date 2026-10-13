-- Additive: keep all legacy records and label them USD, matching the previous dashboard.
ALTER TABLE transactions ALTER COLUMN amount TYPE numeric(23,4);
ALTER TABLE transactions ADD COLUMN currency varchar(3) NOT NULL DEFAULT 'USD';
ALTER TABLE transactions ADD COLUMN origin varchar(255) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE transactions ADD COLUMN account_ref varchar(255) NOT NULL DEFAULT 'default';
ALTER TABLE transactions ADD COLUMN source_record_id varchar(255);
ALTER TABLE transactions ADD COLUMN import_batch_id varchar(255);
ALTER TABLE transactions ADD COLUMN source_row integer;
ALTER TABLE transactions ADD COLUMN refund_of bigint REFERENCES transactions(id);
ALTER TABLE transactions ADD COLUMN deleted boolean NOT NULL DEFAULT false;
CREATE INDEX transactions_owner_period ON transactions(user_id,currency,date) WHERE NOT deleted;
CREATE INDEX transactions_overlap ON transactions(user_id,currency,date,amount,type) WHERE NOT deleted;
ALTER TABLE budgets ADD COLUMN currency varchar(3) NOT NULL DEFAULT 'USD';
ALTER TABLE budgets ALTER COLUMN monthly_limit TYPE numeric(23,4);
CREATE TABLE import_batches (
 id uuid PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id), account_ref varchar(80) NOT NULL,
 file_hash varchar(64) NOT NULL, filename varchar(255) NOT NULL, source_bytes bytea NOT NULL,
 status varchar(40) NOT NULL DEFAULT 'QUEUED', stage varchar(40) NOT NULL DEFAULT 'UPLOADED',
 total_rows integer NOT NULL DEFAULT 0, attempts integer NOT NULL DEFAULT 0,
 retryable boolean NOT NULL DEFAULT true, error_code varchar(100), claim_token uuid,
 created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, duration_ms bigint,
 UNIQUE(user_id,account_ref,file_hash)
);
CREATE INDEX import_jobs_ready ON import_batches(status,next_attempt_at);
CREATE TABLE import_rows (
 batch_id uuid NOT NULL REFERENCES import_batches(id), row_number integer NOT NULL,
 raw_data text NOT NULL, status varchar(40) NOT NULL DEFAULT 'STAGED', error_code varchar(100),
 message varchar(255), transaction_id bigint REFERENCES transactions(id), candidates text,
 PRIMARY KEY(batch_id,row_number)
);
CREATE TABLE import_identities (
 user_id bigint NOT NULL REFERENCES users(id), account_ref varchar(80) NOT NULL, source_id varchar(255) NOT NULL,
 transaction_id bigint NOT NULL REFERENCES transactions(id), revision integer NOT NULL,
 payload_hash varchar(64) NOT NULL,
 PRIMARY KEY(user_id,account_ref,source_id)
);
-- Day 1 raw.expenses is intentionally unchanged and never included in application totals.
