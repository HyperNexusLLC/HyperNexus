-- HyperNexus web authentication schema
CREATE TABLE IF NOT EXISTS auth_users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reset_requested_at TIMESTAMPTZ,
    reset_token_hash TEXT,
    reset_token_expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auth_users_email_idx ON auth_users (email);
