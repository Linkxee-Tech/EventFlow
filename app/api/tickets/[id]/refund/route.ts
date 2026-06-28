import { NextRequest } from 'next/server';
import { getTicket, getOrder, putTicket, putOrder, getEvent } from '@/lib/db';
import { apiError, apiSuccess, requireAuth } from '@/lib/utils';
import { stripe } from '@/lib/stripe';

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);

    const body = await req.json().catch(() => null);
    if (!body?.eventId) return apiError('eventId is required', 400);

    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const event = await getEvent(body.eventId);
    if (!event) return apiError('Event not found', 404);

    // Verify organizer
    if (event.organizerId !== auth.userId) {
      return apiError('Forbidden', 403);
    }

    const ticket = await getTicket(body.eventId, ticketId);
    if (!ticket) return apiError('Ticket not found', 404);

    if (ticket.status === 'refunded') {
      return apiError('Ticket is already refunded', 400);
    }

    const order = await getOrder(ticket.orderId);
    if (!order) return apiError('Order not found', 404);

    // Issue Stripe refund (only the ticket's pricePaid)
    // In test mode without real keys, this might be a mock.
    if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
      // Mock mode
      console.log(`[mock] Refunded ${ticket.pricePaid} cents for ticket ${ticket.ticketId}`);
    } else {
      await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        amount: ticket.pricePaid,
        reason: 'requested_by_customer',
      });
    }

    // Update ticket status
    ticket.status = 'refunded';
    await putTicket(ticket);

    // If all tickets in the order are refunded, mark order as refunded
    const allTicketsRefunded = await Promise.all(
      order.tickets.map((id) => getTicket(body.eventId, id))
    ).then((tickets) => tickets.every((t) => !t || t.status === 'refunded'));

    if (allTicketsRefunded) {
      order.status = 'refunded';
      await putOrder(order);
    }

    return apiSuccess({ refunded: true });
  } catch (err: any) {
    console.error('[refund error]', err);
    return apiError(err.message ?? 'Refund failed', 500);
  }
}
