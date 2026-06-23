/**
 * lib/email.ts — Transactional email via Resend.
 * Sends ticket confirmation emails with inline QR code.
 */

import { ENV } from '@/lib/env';
import type { Order, Event, Ticket } from '@/types';

interface TicketEmailPayload {
  order: Order;
  event: Event;
  tickets: Ticket[];
  tierName: string;
}

function buildTicketEmailHtml(payload: TicketEmailPayload): string {
  const { order, event, tickets, tierName } = payload;
  const ticket = tickets[0];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Tickets — ${event.name}</title>
</head>
<body style="background:#0F0F1A;color:#F1F5F9;font-family:-apple-system,sans-serif;margin:0;padding:0">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px">
      <div style="background:#6366F1;width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px">🎟</div>
      <h1 style="font-size:22px;font-weight:700;margin:0 0 6px">You're going!</h1>
      <p style="font-size:14px;color:#94A3B8;margin:0">Your tickets for <strong style="color:#F1F5F9">${event.name}</strong> are confirmed.</p>
    </div>

    <!-- Ticket Card -->
    <div style="background:#1A1A2E;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;margin-bottom:20px">
      <div style="background:#6366F1;padding:20px;text-align:center">
        <p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.1em">EventFlow Ticket</p>
        <h2 style="font-size:18px;font-weight:600;color:white;margin:0 0 4px">${event.name}</h2>
        <p style="font-size:13px;color:rgba(255,255,255,0.7);margin:0">${tierName} × ${tickets.length}</p>
      </div>
      <div style="padding:24px">
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
            <td style="padding:8px 0;color:#94A3B8">Date</td>
            <td style="padding:8px 0;text-align:right;font-weight:500">${new Date(event.date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
            <td style="padding:8px 0;color:#94A3B8">Venue</td>
            <td style="padding:8px 0;text-align:right;font-weight:500">${event.venue}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
            <td style="padding:8px 0;color:#94A3B8">Attendee</td>
            <td style="padding:8px 0;text-align:right;font-weight:500">${order.buyerName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94A3B8">Order</td>
            <td style="padding:8px 0;text-align:right;font-weight:500;color:#6366F1">#${order.orderId.slice(-8).toUpperCase()}</td>
          </tr>
        </table>
        <div style="text-align:center;margin-top:20px;padding:16px;background:rgba(99,102,241,0.08);border-radius:10px">
          <p style="font-size:11px;color:#94A3B8;margin:0 0 8px">View your QR tickets on the EventFlow app</p>
          <a href="${ENV.APP_URL}/confirmation/${order.orderId}" 
             style="background:#6366F1;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:500;display:inline-block">
            View Tickets →
          </a>
        </div>
      </div>
    </div>

    <!-- Order Summary -->
    <div style="background:#1A1A2E;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-bottom:20px">
      <h3 style="font-size:13px;font-weight:500;margin:0 0 12px">Order summary</h3>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#94A3B8;margin-bottom:6px">
        <span>${tierName} × ${tickets.length}</span>
        <span>$${((order.totalAmount - order.platformFee) / 100).toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#94A3B8;margin-bottom:10px">
        <span>Platform fee</span>
        <span>$${(order.platformFee / 100).toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08)">
        <span>Total paid</span>
        <span>$${(order.totalAmount / 100).toFixed(2)}</span>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:11px;color:#475569;margin:0">
      Powered by <strong style="color:#6366F1">EventFlow</strong> · 
      <a href="${ENV.APP_URL}" style="color:#6366F1;text-decoration:none">eventflow.app</a>
    </p>
  </div>
</body>
</html>`;
}


/** Builds a base64-encoded ICS calendar file for the event */
function buildICSBase64(event: Event): string {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventFlow//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.name}`,
    `LOCATION:${event.venue}`,
    'DESCRIPTION:Booked via EventFlow — eventflow.app',
    `UID:ef-${event.id}@eventflow.app`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return Buffer.from(ics).toString('base64');
}

export async function sendTicketConfirmationEmail(
  payload: TicketEmailPayload
): Promise<{ success: boolean; error?: string }> {
  if (!ENV.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    return { success: true }; // Don't fail the purchase flow
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EventFlow Tickets <tickets@eventflow.app>',
        to: [payload.order.buyerEmail],
        subject: `🎟 Your tickets for ${payload.event.name}`,
        html: buildTicketEmailHtml(payload),
        // text/calendar ICS attachment — enables "Add to Calendar" from email client
        attachments: [
          {
            filename: payload.event.name.replace(/\s+/g, '-') + '.ics',
            content: buildICSBase64(payload.event),
            content_type: 'text/calendar',
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[email] Resend error:', err);
      return { success: false, error: err };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[email] Network error:', err.message);
    return { success: false, error: err.message };
  }
}
