-- Apply explicitly as the application database administrator after a verified backup.
-- This repository does not use Flyway; Hibernate update remains for development.
-- Additive only: no edits to users, transactions, budgets, or pipeline schemas.
BEGIN;
CREATE TABLE IF NOT EXISTS public.auth_sessions (
    id varchar(255) PRIMARY KEY,
    user_id bigint NOT NULL,
    expires_at timestamptz(6) NOT NULL,
    revoked boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON public.auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS public.refresh_credentials (
    token_hash varchar(64) PRIMARY KEY,
    session_id varchar(255) NOT NULL,
    consumed boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS refresh_credentials_session_idx ON public.refresh_credentials(session_id);
COMMIT;
