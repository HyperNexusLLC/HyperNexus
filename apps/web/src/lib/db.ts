import { Pool, type QueryResultRow } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const globalForDb = globalThis as typeof globalThis & { authPool?: Pool };

function getDatabaseUrl(): string {
    return (
        process.env.AUTH_DATABASE_URL ??
        process.env.DATABASE_URL ??
        'postgresql://hypernexus:hypernexus_auth@localhost:5433/hypernexus_auth'
    );
}

export function getPool(): Pool {
    if (!globalForDb.authPool) {
        globalForDb.authPool = new Pool({
            connectionString: getDatabaseUrl(),
            max: 10,
        });
    }
    return globalForDb.authPool;
}

export const db = drizzle(getPool(), { schema });

const INIT_SQL = `
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
`;

let schemaReady: Promise<void> | null = null;

export async function ensureAuthSchema(): Promise<void> {
    if (!schemaReady) {
        schemaReady = getPool()
            .query(INIT_SQL)
            .then(() => undefined)
            .catch((error) => {
                schemaReady = null;
                throw error;
            });
    }
    await schemaReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
): Promise<{ rows: T[] }> {
    await ensureAuthSchema();
    return getPool().query<T>(text, params);
}
