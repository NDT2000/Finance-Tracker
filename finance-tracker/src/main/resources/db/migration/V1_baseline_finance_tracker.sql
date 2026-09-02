CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_transactions_user_id
    ON transactions(user_id);

CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    monthly_limit NUMERIC(19, 2) NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_budgets_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_budgets_user_id
    ON budgets(user_id);