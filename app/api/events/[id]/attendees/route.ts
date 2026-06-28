import { NextRequest } from 'next/server';
import { getEvent, listTicketsByEvent } from '@/lib/db';
import { apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { logError } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const event = await getEvent(resolvedParams.id);
    if (!event) return apiError('Event not found', 404);
    if (event.organizerId !== auth.userId) return apiError('Forbidden', 403);
    const tickets = await listTicketsByEvent(resolvedParams.id);
    const attendees = tickets
      .filter((t) => t.status === 'paid' || t.status === 'used')
      .map((t) => ({
        ticketId: t.ticketId,
        buyerName: t.buyerName,
        buyerEmail: t.buyerEmail,
        tierId: t.tierId,
        status: t.status,
        checkedInAt: t.checkedInAt ?? null,
        pricePaid: t.pricePaid,
      }));
    return apiSuccess(attendees);
  } catch (err) {
    logError('GET /api/events/[id]/attendees', err);
    return apiError('Failed to load attendees', 500);
  }
}
