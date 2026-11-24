-- Allow REFUND transactions on databases that were created before Flyway.
--
-- Databases first created by Hibernate (ddl-auto=update) carry an auto-generated
-- transactions_type_check that only allows INCOME and EXPENSE, because REFUND did not exist yet.
-- Flyway never created that constraint, so later migrations did not update it, and those databases
-- reject every refund (manual or imported). Databases built from V1 have no such constraint.
--
-- Replace whatever exists with one that matches the application's TransactionType enum, so both kinds
-- of database end up identical. Adding the constraint checks existing rows, which only use the
-- previously allowed types.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('INCOME', 'EXPENSE', 'REFUND'));
