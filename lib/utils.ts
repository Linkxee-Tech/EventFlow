import { randomBytes, createHash } from 'crypto';
import { customAlphabet } from 'nanoid';

// ─── ID Generation ────────────────────────────────────────────────────────────

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export function generateId(prefix?: string): string {
  return prefix ? `${prefix}_${nanoid()}` : nanoid();
}

// ─── Slug Generation ──────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) +
    '-' +
    nanoid().slice(0, 6)
  );
}

// ─── QR Hash Generation ───────────────────────────────────────────────────────

const QR_SECRET = process.env.QR_SECRET ?? 'eventflow-qr-secret';

/**
 * Generates a time-windowed QR hash that refreshes every 30 seconds.
 * The window param allows verifying the previous window for scanner latency.
 */
export function generateQrHash(
  ticketId: string,
  window?: number
): string {
  const timeWindow = window ?? Math.floor(Date.now() / 30_000);
  return createHash('sha256')
    .update(`${ticketId}:${timeWindow}:${QR_SECRET}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyQrHash(ticketId: string, hash: string): boolean {
  const currentWindow = Math.floor(Date.now() / 30_000);
  // Accept current window and the previous one (30s tolerance)
  return (
    generateQrHash(ticketId, currentWindow) === hash ||
    generateQrHash(ticketId, currentWindow - 1) === hash
  );
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

export function formatEventDate(isoString: string): string {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);
}

// ─── API Response Helpers ─────────────────────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400): Response {
  return Response.json({ success: false, error: message }, { status });
}

// ─── Server-side Auth Guard ───────────────────────────────────────────────────

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function requireAuth(): Promise<{
  userId: string;
  email: string;
  stripeAccountId?: string;
} | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    userId: (session.user as any).id,
    email: session.user.email!,
    stripeAccountId: (session.user as any).stripeAccountId,
  };
}
