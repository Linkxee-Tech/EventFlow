import { NextRequest } from 'next/server';
import { getTicket } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/utils';
import { logError } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) return apiError('eventId query param required', 400);
    const ticket = await getTicket(eventId, resolvedParams.id);
    if (!ticket) return apiError('Ticket not found', 404);
    const { qrHash: _qr, ...safeTicket } = ticket;
    return apiSuccess(safeTicket);
  } catch (err) {
    logError('GET /api/tickets/[id]', err);
    return apiError('Failed to load ticket', 500);
  }
}
