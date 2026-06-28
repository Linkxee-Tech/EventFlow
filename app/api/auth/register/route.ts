import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { getUserByEmail, putUser } from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit, rateLimitHeaders } from '@/lib/ratelimit';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function hashPassword(password: string): string {
  const salt = process.env.NEXTAUTH_SECRET ?? 'eventflow-salt';
  return createHash('sha256').update(salt + password).digest('hex');
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const rateLimit = await checkRateLimit(ip, 'register');
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: rateLimitHeaders(rateLimit) });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    
    const { name, email, password } = parsed.data;

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
