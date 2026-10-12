CREATE TABLE financial_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(30) NOT NULL,
    balance NUMERIC(19, 2) NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_financial_accounts_user
        FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT uk_financial_account_user_name
        UNIQUE (user_id, name),

    CONSTRAINT ck_financial_account_currency
        CHECK (CHAR_LENGTH(currency) = 3),

    CONSTRAINT ck_financial_account_balance
        CHECK (balance >= 0)
);

CREATE INDEX idx_financial_accounts_user_id
    ON financial_accounts(user_id);