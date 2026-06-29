import { logger } from '@/lib/logger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import {
  getTicket,
  putOrder,
  confirmTicketTransaction,
  getEvent,
  updateReservationStatus,
  getReservation,
  atomicIncrementAvailability,
  updateUserStripeAccount,
} from '@/lib/db';
import { sendTicketConfirmationEmail } from '@/lib/email';
import { generateId } from '@/lib/utils';
import type { Order } from '@/types';


export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get('stripe-signature') ?? '';

  let event;
  try {
    event = constructWebhookEvent(rawBody, sig);
  } catch (e: any) {
    console.error('[webhook] Signature verification failed:', e.message);
    return new Response(`Webhook Error: ${e.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Payment succeeded ────────────────────────────────────────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as any;
        const { reservationId, eventId, tierId, quantity, buyerEmail, buyerName } = pi.metadata ?? {};
        if (!reservationId || !eventId) break;

        const eventRecord = await getEvent(eventId);
        if (!eventRecord) break;

        const reservation = await getReservation(reservationId);
        if (!reservation) break;

        const orderId = generateId('ord');
        const now = new Date().toISOString();

        const order: Order = {
          orderId,
          eventId,
          organizerId: eventRecord.organizerId,
          buyerEmail,
          buyerName,
          totalAmount: pi.amount,
          platformFee: pi.application_fee_amount ?? 0,
          netToOrganizer: pi.amount - (pi.application_fee_amount ?? 0),
          stripePaymentIntentId: pi.id,
          status: 'completed',
          tickets: reservation.ticketIds,
          createdAt: now,
        };

        // Transactionally confirm each ticket
        for (const ticketId of reservation.ticketIds) {
          const ticket = await getTicket(eventId, ticketId);
          if (!ticket || ticket.status === 'paid') continue;
          await confirmTicketTransaction({ ...ticket, orderId }, order).catch(() => {});
        }

        await updateReservationStatus(reservationId, 'paid');

        // Send confirmation email (non-blocking — don't fail webhook on email error)
        const tier = eventRecord.tiers.find((t) => t.tierId === tierId);
        if (reservation.ticketIds.length > 0) {
          const firstTicket = await getTicket(eventId, reservation.ticketIds[0]);
          if (firstTicket) {
            sendTicketConfirmationEmail({
              order,
              event: eventRecord,
              tickets: [firstTicket],
              tierName: tier?.name ?? 'General Admission',
            }).catch((e) => console.error('[email] send failed:', e));
          }
        }

        logger.info({ orderId, eventId }, '[webhook] Order confirmed');
        break;
      }

      // ── Payment failed → REVERT INVENTORY ───────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as any;
        const { reservationId, eventId, tierId, quantity } = pi.metadata ?? {};

        logger.warn({ reservationId, eventId, quantity }, '[webhook] Payment failed — reverting inventory');

        if (eventId && tierId && quantity) {
          // Atomically add back the inventory that was decremented on reserve
          await atomicIncrementAvailability(eventId, tierId, parseInt(quantity)).catch(
            (e) => logger.error('[webhook] Inventory rollback failed')
          );
        }

        if (reservationId) {
          await updateReservationStatus(reservationId, 'expired').catch(() => {});
        }
        break;
      }

      // ── Stripe Connect: organizer onboarding complete ─────────────────────
      case 'account.updated': {
        const account = event.data.object as any;
        if (account.details_submitted && account.metadata?.organizerId) {
          await updateUserStripeAccount(account.metadata.organizerId, account.id, true);
          logger.info({ accountId: account.id }, '[webhook] Stripe account onboarded');
        }
        break;
      }

      default:
        break;
    }
  } catch (err: any) {
    // Log but always return 200 so Stripe doesn't retry endlessly
    logger.error({ eventType: event.type, err: err.message }, '[webhook] Handler error');
  }

  return Response.json({ received: true });
}
