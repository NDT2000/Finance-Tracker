-- What-if plans are isolated from the canonical transactions and import identities.
CREATE TABLE financial_plans (
 id uuid PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id), name varchar(100) NOT NULL,
 currency varchar(3) NOT NULL, start_month varchar(7) NOT NULL,
 months integer NOT NULL CHECK(months BETWEEN 1 AND 36),
 opening_cash numeric(23,4) NOT NULL,
 opening_investments numeric(23,4) NOT NULL CHECK(opening_investments >= 0),
 cash_reserve numeric(23,4) NOT NULL CHECK(cash_reserve >= 0),
 annual_return_percent numeric(7,4) NOT NULL CHECK(annual_return_percent BETWEEN -100 AND 100)
);
CREATE INDEX financial_plans_owner ON financial_plans(user_id);
CREATE TABLE plan_events (
 id uuid PRIMARY KEY, plan_id uuid NOT NULL REFERENCES financial_plans(id) ON DELETE CASCADE,
 name varchar(100) NOT NULL, kind varchar(30) NOT NULL, recurrence varchar(20) NOT NULL,
 amount numeric(23,4) NOT NULL CHECK(amount > 0),
 first_month integer NOT NULL CHECK(first_month >= 1),
 last_month integer NOT NULL CHECK(last_month >= first_month AND last_month <= 36)
);
CREATE INDEX plan_events_plan ON plan_events(plan_id);
