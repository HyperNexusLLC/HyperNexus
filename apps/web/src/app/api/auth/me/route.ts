import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/authStore';
import { AUTH_COOKIE_NAME, verifyAccessToken } from '@/lib/jwt';

function extractBearerToken(req: Request): string | null {
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return null;
    }
    const token = authorization.slice('Bearer '.length).trim();
    return token || null;
}

export async function GET(req: Request) {
    const cookieStore = await cookies();
    const token = extractBearerToken(req) ?? cookieStore.get(AUTH_COOKIE_NAME)?.value ?? '';
    const payload = verifyAccessToken(token);

    if (!payload) {
        return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const user = await getUserById(payload.sub);
    if (!user) {
        return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, user });
}
