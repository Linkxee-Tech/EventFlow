import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { getUserByEmail, putUser } from '@/lib/db';

function hashPassword(password: string): string {
  const salt = process.env.NEXTAUTH_SECRET ?? 'eventflow-salt';
  return createHash('sha256').update(salt + password).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const userId = randomUUID();
    await putUser({
      userId,
      email,
      name,
      role: 'organizer',
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password),
    });

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
