import { notFound } from 'next/navigation';
import { getOrder, getTicket, getEvent } from '@/lib/db';
import { formatCents, formatEventDate } from '@/lib/utils';
import { QRTicket } from '@/components/event/QRTicket';
import Link from 'next/link';
import { ShareButton } from '@/components/event/ShareButton';
import {
  CheckCircle, Download, CalendarPlus,
  ExternalLink
} from 'lucide-react';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ payment_intent?: string }>;
};

export const metadata: Metadata = { title: 'Tickets Confirmed — EventFlow' };

function buildCalendarUrl(event: { name: string; date: string; venue: string }): string {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // +3 hours default
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return (
    'https://www.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(event.name)}` +
    `&dates=${fmt(start)}/${fmt(end)}` +
    `&location=${encodeURIComponent(event.venue)}` +
    `&details=${encodeURIComponent('Ticket booked via EventFlow')}`
  );
}

function buildICSContent(event: { name: string; date: string; venue: string }): string {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventFlow//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.name}`,
    `LOCATION:${event.venue}`,
    `DESCRIPTION:Ticket booked via EventFlow`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const order = await getOrder(resolvedParams.orderId);
  if (!order) notFound();

  const event = await getEvent(order.eventId);
  if (!event) notFound();

  // Load tickets in parallel
  const tickets = await Promise.all(
    order.tickets.map((id) => getTicket(order.eventId, id))
  ).then((ts) => ts.filter(Boolean) as Awaited<ReturnType<typeof getTicket>>[]);

  const tier = event.tiers.find((t) => t.tierId === tickets[0]?.tierId);
  const tierName = tier?.name ?? 'General Admission';
  const googleCalUrl = buildCalendarUrl(event);
  const icsUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(buildICSContent(event))}`;

  return (
    <main className="min-h-screen bg-[#0F0F1A] text-white py-10 px-4">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">You&apos;re going!</h1>
          <p className="text-slate-400 text-sm">
            Tickets confirmed and sent to{' '}
            <strong className="text-white">{order.buyerEmail}</strong>
          </p>
        </div>

        {/* QR Ticket */}
        {tickets[0] && (
          <div className="mb-4">
            <QRTicket
              ticket={tickets[0] as any}
              event={event}
              tierName={tierName}
              quantity={tickets.length}
            />
          </div>
        )}

        {/* Order summary */}
        <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-5 mb-4 text-sm space-y-2">
          <h2 className="font-medium mb-3">Order summary</h2>
          <div className="flex justify-between text-slate-400">
            <span>{tierName} × {tickets.length}</span>
            <span>{formatCents(order.totalAmount - order.platformFee)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              Platform fee
              <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded-full">
                2.5% + $0.30
              </span>
            </span>
            <span>{formatCents(order.platformFee)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-white/8 pt-2 mt-2">
            <span>Total paid</span>
            <span>{formatCents(order.totalAmount)}</span>
          </div>
          <div className="pt-2 border-t border-white/8 text-[10px] text-slate-500 font-mono">
            Order #{order.orderId.slice(-10).toUpperCase()}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <a
            href={icsUrl}
            download={`${event.name.replace(/\s+/g, '-')}.ics`}
            className="flex flex-col items-center gap-1.5 bg-[#1A1A2E] border border-white/8 hover:border-white/20 rounded-xl py-3 px-2 transition-colors group"
          >
            <Download className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
            <span className="text-[10px] text-slate-400 group-hover:text-white transition-colors text-center">
              Download
            </span>
          </a>

          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 bg-[#1A1A2E] border border-white/8 hover:border-white/20 rounded-xl py-3 px-2 transition-colors group"
          >
            <CalendarPlus className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
            <span className="text-[10px] text-slate-400 group-hover:text-white transition-colors text-center">
              Add to Calendar
            </span>
          </a>

          <ShareButton eventName={event.name} eventSlug={event.slug} />
        </div>

        {/* Apple Wallet placeholder */}
        <div className="bg-[#1A1A2E] border border-white/8 rounded-xl p-4 flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium">Add to Apple Wallet</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Available in the EventFlow mobile app
            </p>
          </div>
          <div className="bg-black border border-white/10 text-white text-xs px-3 py-1.5 rounded-lg opacity-60 cursor-not-allowed">
            Add to  Wallet
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex justify-center gap-4 text-sm">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Browse more events
          </Link>
          <span className="text-slate-700">·</span>
          <Link
            href={`/events/${event.slug}`}
            className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            Event page <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </main>
  );
}
