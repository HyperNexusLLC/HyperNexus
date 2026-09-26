import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/authStore';
import { AUTH_COOKIE_NAME, signAccessToken } from '@/lib/jwt';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const email = String(body?.email ?? '').trim();
        const password = String(body?.password ?? '');

        if (!email || !password) {
            return NextResponse.json({ ok: false, error: 'Email and password are required.' }, { status: 400 });
        }

        const result = await authenticateUser({ email, password });
        if (!result.ok) {
            return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 401 });
        }

        const { token, expiresAt } = signAccessToken({
            userId: result.user.id,
            email: result.user.email,
            name: result.user.name,
        });

        const response = NextResponse.json({
            ok: true,
            user: result.user,
            token,
            expiresAt,
        });

        response.cookies.set(AUTH_COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24,
        });

        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request payload.';
        return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
}
