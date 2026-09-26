import { NextResponse } from 'next/server';
import { createUser } from '@/lib/authStore';
import { AUTH_COOKIE_NAME, signAccessToken } from '@/lib/jwt';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const name = String(body?.name ?? '').trim();
        const email = String(body?.email ?? '').trim();
        const password = String(body?.password ?? '');

        if (!name || !email || !password) {
            return NextResponse.json({ ok: false, error: 'Name, email, and password are required.' }, { status: 400 });
        }
        if (!email.includes('@')) {
            return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        const result = await createUser({ name, email, password });
        if (!result.ok) {
            return NextResponse.json({ ok: false, error: 'An account with this email already exists.' }, { status: 409 });
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
