import { NextRequest } from 'next/server';
import {
  getReservation, getEvent, getUser, putOrder,
  confirmTicketTransaction, updateReservationStatus, getTicket,
} from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { generateId, apiSuccess, apiError } from '@/lib/utils';
import { sendTicketConfirmationEmail } from '@/lib/email';
import { logError } from '@/lib/logger';
import type { Order } from '@/types';
import { z } from 'zod';

const confirmSchema = z.object({
  reservationId: z.string(),
  buyerEmail: z.string().email(),
  buyerName: z.string().min(1).max(100),
  eventId: z.string(),
});

// POST /api/tickets/confirm
// Idempotent: uses reservationId as Stripe idempotency key.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

    const { reservationId, buyerEmail, buyerName, eventId } = parsed.data;

    // 1. Load + validate reservation
    const reservation = await getReservation(reservationId);
    if (!reservation) {
      return apiError('Reservation not found or has expired. Please start over.', 404);
    }

    // Idempotent: already paid
    if (reservation.status === 'paid') {
      return apiSuccess({ orderId: reservationId, clientSecret: null, alreadyPaid: true });
    }

    // 2. Load event + organizer
    const event = await getEvent(eventId);
    if (!event) return apiError('Event not found', 404);

    const organizer = await getUser(event.organizerId);
    if (!organizer?.stripeAccountId) {
      return apiError('Organizer payment account not configured', 500);
    }

    // 3. Retrieve existing PaymentIntent (created at reserve time)
    if (!reservation.stripePaymentIntentId) {
      return apiError('No payment intent found for this reservation', 500);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      reservation.stripePaymentIntentId
    );

    // 4. Build and store order
    const orderId = generateId('ord');
    const now = new Date().toISOString();

    const order: Order = {
      orderId,
      eventId,
      organizerId: event.organizerId,
      buyerEmail,
      buyerName,
      totalAmount: paymentIntent.amount,
      platformFee: paymentIntent.application_fee_amount ?? 0,
      netToOrganizer: paymentIntent.amount - (paymentIntent.application_fee_amount ?? 0),
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
      tickets: reservation.ticketIds,
      createdAt: now,
    };

    await putOrder(order);
    await updateReservationStatus(reservationId, 'paid');

    // 5. Return client_secret for Stripe.confirmPayment()
    return apiSuccess({
      orderId,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
    });
  } catch (err) {
    logError('POST /api/tickets/confirm', err);
    return apiError('Payment confirmation failed. Your card has not been charged.', 500);
  }
}
