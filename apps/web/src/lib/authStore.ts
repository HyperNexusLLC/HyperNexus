import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { query } from '@/lib/db';

const BCRYPT_ROUNDS = 12;

type AuthUserRow = {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    created_at: string;
    reset_requested_at?: string | null;
    reset_token_hash?: string | null;
    reset_token_expires_at?: string | null;
};

export type PublicUser = {
    id: string;
    name: string;
    email: string;
};

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

function mapUser(row: AuthUserRow): PublicUser {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
    };
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
}

export async function createUser(input: { name: string; email: string; password: string }) {
    const normalized = normalizeEmail(input.email);
    const existing = await query<AuthUserRow>('SELECT id FROM auth_users WHERE email = $1 LIMIT 1', [normalized]);
    if (existing.rows.length > 0) {
        return { ok: false as const, reason: 'EXISTS' as const };
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(input.password);

    await query(
        `INSERT INTO auth_users (id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [userId, input.name.trim(), normalized, passwordHash],
    );

    return {
        ok: true as const,
        user: {
            id: userId,
            name: input.name.trim(),
            email: normalized,
        },
    };
}

export async function authenticateUser(input: { email: string; password: string }) {
    const normalized = normalizeEmail(input.email);
    const result = await query<AuthUserRow>(
        `SELECT id, name, email, password_hash, created_at
         FROM auth_users
         WHERE email = $1
         LIMIT 1`,
        [normalized],
    );

    const user = result.rows[0];
    if (!user) {
        return { ok: false as const, reason: 'INVALID_CREDENTIALS' as const };
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
        return { ok: false as const, reason: 'INVALID_CREDENTIALS' as const };
    }

    return {
        ok: true as const,
        user: mapUser(user),
    };
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
    if (!userId) {
        return null;
    }

    const result = await query<AuthUserRow>(
        `SELECT id, name, email, password_hash, created_at
         FROM auth_users
         WHERE id = $1
         LIMIT 1`,
        [userId],
    );

    const user = result.rows[0];
    return user ? mapUser(user) : null;
}

export async function markResetRequested(email: string) {
    const normalized = normalizeEmail(email);
    const result = await query<AuthUserRow>(
        `SELECT id, name, email, password_hash, created_at
         FROM auth_users
         WHERE email = $1
         LIMIT 1`,
        [normalized],
    );

    const user = result.rows[0];
    let resetToken: string | undefined;

    if (user) {
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();

        await query(
            `UPDATE auth_users
             SET reset_requested_at = NOW(),
                 reset_token_hash = $2,
                 reset_token_expires_at = $3
             WHERE id = $1`,
            [user.id, hashResetToken(token), expiresAt],
        );

        resetToken = token;
    }

    return { ok: true as const, resetToken };
}

export async function resetPasswordWithToken(input: { token: string; newPassword: string }) {
    const tokenHash = hashResetToken(input.token);
    const result = await query<AuthUserRow>(
        `SELECT id, name, email, password_hash, created_at, reset_token_hash, reset_token_expires_at
         FROM auth_users
         WHERE reset_token_hash = $1
           AND reset_token_expires_at IS NOT NULL
           AND reset_token_expires_at >= NOW()
         LIMIT 1`,
        [tokenHash],
    );

    const user = result.rows[0];
    if (!user) {
        return { ok: false as const, reason: 'INVALID_OR_EXPIRED' as const };
    }

    const passwordHash = await hashPassword(input.newPassword);
    await query(
        `UPDATE auth_users
         SET password_hash = $2,
             reset_requested_at = NOW(),
             reset_token_hash = NULL,
             reset_token_expires_at = NULL
         WHERE id = $1`,
        [user.id, passwordHash],
    );

    return {
        ok: true as const,
        user: mapUser(user),
    };
}
