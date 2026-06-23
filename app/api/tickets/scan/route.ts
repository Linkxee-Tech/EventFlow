import { NextRequest } from 'next/server';
import { getEvent, getTicket, updateTicketStatus } from '@/lib/db';
import { verifyQrHash, apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { logError } from '@/lib/logger';
import type { ScanTicketInput, ScanTicketResponse } from '@/types';
import { z } from 'zod';

const scanSchema = z.object({
  ticketId: z.string(),
  eventId: z.string(),
  qrHash: z.string(),
  manualOverride: z.boolean().optional().default(false),
});

// POST /api/tickets/scan — validate and check in a ticket
// Also supports manual check-in toggle from AttendeeList (manualOverride: true)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);

    const body = await req.json().catch(() => null);
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) return apiError('Invalid request', 422);

    const { ticketId, eventId, qrHash, manualOverride } = parsed.data;

    // Verify organizer owns this event
    const event = await getEvent(eventId);
    if (!event) return apiError('Event not found', 404);
    if (event.organizerId !== auth.userId) return apiError('Forbidden', 403);

    const ticket = await getTicket(eventId, ticketId);
    if (!ticket) {
      const response: ScanTicketResponse = { valid: false, message: 'Ticket not found' };
      return apiSuccess(response);
    }

    // Skip QR verification for manual dashboard toggle
    if (!manualOverride) {
      if (!verifyQrHash(ticketId, qrHash)) {
        const response: ScanTicketResponse = { valid: false, message: 'Invalid or expired QR code' };
        return apiSuccess(response);
      }
    }

    if (ticket.status === 'used') {
      // Manual toggle: reverse check-in
      if (manualOverride) {
        await updateTicketStatus(eventId, ticketId, 'paid');
        const response: ScanTicketResponse = {
          valid: true,
          ticket: { ...ticket, status: 'paid', checkedInAt: undefined },
          attendeeName: ticket.buyerName,
          message: 'Check-in reversed',
        };
        return apiSuccess(response);
      }
      const response: ScanTicketResponse = {
        valid: false,
        ticket,
        message: `Already checked in at ${new Date(ticket.checkedInAt!).toLocaleTimeString()}`,
      };
      return apiSuccess(response);
    }

    if (ticket.status === 'refunded') {
      return apiSuccess({ valid: false, message: 'Ticket has been refunded' } as ScanTicketResponse);
    }

    if (ticket.status === 'reserved') {
      return apiSuccess({ valid: false, message: 'Ticket has not been paid for' } as ScanTicketResponse);
    }

    if (ticket.status !== 'paid') {
      return apiSuccess({ valid: false, message: 'Invalid ticket status' } as ScanTicketResponse);
    }

    // Mark as used
    const checkedInAt = new Date().toISOString();
    await updateTicketStatus(eventId, ticketId, 'used', { checkedInAt });

    const tier = event.tiers.find((t) => t.tierId === ticket.tierId);
    const response: ScanTicketResponse = {
      valid: true,
      ticket: { ...ticket, status: 'used', checkedInAt },
      attendeeName: ticket.buyerName,
      tierName: tier?.name ?? ticket.tierId,
      message: `Welcome, ${ticket.buyerName}!`,
    };
    return apiSuccess(response);
  } catch (err) {
    logError('POST /api/tickets/scan', err);
    return apiError('Scan failed', 500);
  }
}
