-- Add a real bank-account association without changing source import identity or old amounts.
ALTER TABLE transactions ADD COLUMN bank_account_id bigint
    REFERENCES financial_accounts(id) ON DELETE SET NULL;
-- Keep the historical account label when an account entry is deleted.
ALTER TABLE transactions ADD COLUMN bank_account_name varchar(100);
CREATE INDEX transactions_owner_bank_period ON transactions(user_id, bank_account_id, date)
    WHERE NOT deleted;
-- Existing records intentionally remain unassigned; no bank is guessed from account_ref.
