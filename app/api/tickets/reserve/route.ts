import { NextRequest } from 'next/server';
import {
  getEvent,
  getTier,
  putTicket,
  putReservation,
  atomicDecrementAvailability,
  ConditionalCheckFailedException,
  getUser,
} from '@/lib/db';
import { createPaymentIntent, calculateFees } from '@/lib/stripe';
import { generateId, generateQrHash, apiSuccess, apiError } from '@/lib/utils';
import { checkRateLimit, rateLimitHeaders } from '@/lib/ratelimit';
import type { Ticket } from '@/types';
import { z } from 'zod';

const reserveSchema = z.object({
  eventId: z.string(),
  tierId: z.string(),
  quantity: z.number().int().min(1).max(20),
  buyerEmail: z.string().email(),
  buyerName: z.string().min(1).max(100),
});

// POST /api/tickets/reserve
export async function POST(req: NextRequest) {
  // ── Rate limiting (Phase 8) ───────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rateLimit = await checkRateLimit(ip, 'reserve');
  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({ success: false, error: 'Too many requests. Please wait a moment and try again.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimit) },
      }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = reserveSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(', '), 422);
  }

  const { eventId, tierId, quantity, buyerEmail, buyerName } = parsed.data;

  // ── Load + validate event/tier ────────────────────────────────────────────
  const event = await getEvent(eventId);
  if (!event || event.status !== 'published') {
    return apiError('Event not found or not available', 404);
  }

  const tier = await getTier(eventId, tierId);
  if (!tier) return apiError('Ticket tier not found', 404);

  if (quantity > tier.maxPerOrder) {
    return apiError(`Maximum ${tier.maxPerOrder} tickets per order for this tier`, 400);
  }

  // ── Atomic decrement (Phase 4 core) ──────────────────────────────────────
  try {
    await atomicDecrementAvailability(eventId, tierId, quantity);
  } catch (e) {
    if (e instanceof ConditionalCheckFailedException) {
      return apiError(
        `Sorry — only ${tier.availableCount} ticket${tier.availableCount === 1 ? '' : 's'} remaining. Please reduce your quantity.`,
        409
      );
    }
    throw e;
  }

  // ── Calculate fees + create PaymentIntent ─────────────────────────────────
  const { subtotal, platformFee, total } = calculateFees(tier.price, quantity);

  const organizer = await getUser(event.organizerId);
  if (!organizer?.stripeAccountId) {
    // Roll back inventory
    const { atomicIncrementAvailability } = await import('@/lib/db');
    await atomicIncrementAvailability(eventId, tierId, quantity).catch(() => {});
    return apiError('Organizer payment account not set up', 500);
  }

  const reservationId = generateId('res');
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 min TTL

  const paymentIntent = await createPaymentIntent({
    amount: total,
    platformFee,
    organizerStripeAccountId: organizer.stripeAccountId,
    metadata: {
      reservationId,
      eventId,
      tierId,
      quantity: String(quantity),
      buyerEmail,
      buyerName,
    },
  });

  // ── Create ticket records (reserved state) ────────────────────────────────
  const now = new Date().toISOString();
  const ticketIds: string[] = [];

  const tickets: Ticket[] = Array.from({ length: quantity }, () => {
    const ticketId = generateId('tk');
    ticketIds.push(ticketId);
    return {
      ticketId,
      eventId,
      tierId,
      orderId: reservationId,
      buyerEmail,
      buyerName,
      qrHash: generateQrHash(ticketId),
      status: 'reserved' as const,
      reservedAt: now,
      pricePaid: tier.price,
      fee: Math.round(platformFee / quantity),
    };
  });

  await Promise.all(tickets.map((t) => putTicket(t)));

  // ── Store reservation with TTL ────────────────────────────────────────────
  await putReservation({
    reservationId,
    eventId,
    tierId,
    quantity,
    ticketIds,
    buyerEmail,
    buyerName,
    stripePaymentIntentId: paymentIntent.id,
    status: 'pending',
    expiresAt,
    createdAt: now,
  });

  return apiSuccess(
    {
      reservationId,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      paymentIntentClientSecret: paymentIntent.client_secret,
      ticketIds,
      amount: total,
      platformFee,
      subtotal,
      tierId,
      quantity,
    },
    201
  );
}
