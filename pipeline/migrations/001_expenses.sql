-- Run as the database administrator, after a verified backup.
-- No changes to public/application tables or database-wide PUBLIC grants.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'finance_pipeline') THEN
    CREATE ROLE finance_pipeline NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE TABLE IF NOT EXISTS raw.expenses (
  synthetic_account text NOT NULL CHECK (synthetic_account LIKE 'synthetic:%'),
  file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
  row_number integer NOT NULL CHECK (row_number > 0),
  expense_date date NOT NULL,
  category text NOT NULL CHECK (length(category) > 0),
  description text NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (synthetic_account, file_sha256, row_number)
);
CREATE OR REPLACE VIEW analytics.monthly_spending AS
SELECT synthetic_account, date_trunc('month', expense_date)::date AS month,
       currency, count(*) AS expense_count, sum(amount) AS total_spent
FROM raw.expenses
GROUP BY synthetic_account, date_trunc('month', expense_date)::date, currency;
GRANT USAGE ON SCHEMA raw, analytics TO finance_pipeline;
GRANT SELECT, INSERT ON raw.expenses TO finance_pipeline;
GRANT SELECT ON analytics.monthly_spending TO finance_pipeline;
