import { createHmac, timingSafeEqual } from 'crypto';

type JwtPayload = {
    sub: string;
    email: string;
    name: string;
    iat: number;
    exp: number;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

function base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlDecode(value: string): string {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (padded.length % 4)) % 4;
    return Buffer.from(padded + '='.repeat(padLength), 'base64').toString('utf8');
}

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET?.trim();
    if (secret) {
        return secret;
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET is not configured.');
    }
    return 'hypernexus-dev-jwt-secret-change-me';
}

function signSegment(payload: JwtPayload): string {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = createHmac('sha256', getJwtSecret())
        .update(`${header}.${body}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    return `${header}.${body}.${signature}`;
}

export function signAccessToken(input: {
    userId: string;
    email: string;
    name: string;
    ttlSeconds?: number;
}): { token: string; expiresAt: string } {
    const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
        sub: input.userId,
        email: input.email,
        name: input.name,
        iat: issuedAt,
        exp: issuedAt + ttlSeconds,
    };

    return {
        token: signSegment(payload),
        expiresAt: new Date((issuedAt + ttlSeconds) * 1000).toISOString(),
    };
}

export function verifyAccessToken(token: string): JwtPayload | null {
    if (!token) {
        return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }

    const [header, body, signature] = parts;
    const expectedSignature = createHmac('sha256', getJwtSecret())
        .update(`${header}.${body}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

    const actual = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        return null;
    }

    try {
        const payload = JSON.parse(base64UrlDecode(body)) as JwtPayload;
        if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

export const AUTH_COOKIE_NAME = 'hypernexus_auth_token';
