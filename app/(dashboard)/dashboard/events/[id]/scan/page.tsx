import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEvent, listEventsByOrganizer, listTicketsByEvent } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { QRScannerWithOffline } from '@/components/event/QRScannerWithOffline';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

type Props = { params: { id: string } };

export const metadata: Metadata = { title: 'Check-in Scanner' };

export default async function EventScanPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? '';

  const event = await getEvent(params.id);
  if (!event) notFound();
  if (event.organizerId !== userId) redirect('/dashboard/events');
  if (event.status !== 'published') redirect(`/dashboard/events/${params.id}`);

  // Pre-load all valid ticket hashes for offline mode
  const tickets = await listTicketsByEvent(params.id);
  const validHashes = tickets
    .filter((t) => t.status === 'paid')
    .map((t) => ({ ticketId: t.ticketId, qrHash: t.qrHash, buyerName: t.buyerName, tierId: t.tierId }));

  const totalCap = event.tiers.reduce((s, t) => s + t.totalCapacity, 0);
  const checkedIn = tickets.filter((t) => t.status === 'used').length;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/events/${params.id}`}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{event.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Check-in Scanner · {checkedIn} / {tickets.filter(t => t.status === 'paid' || t.status === 'used').length} checked in</p>
          </div>
        </div>
      </div>

      <QRScannerWithOffline
        eventId={event.id}
        eventName={event.name}
        tiers={event.tiers}
        preloadedHashes={validHashes}
        initialCheckedIn={checkedIn}
      />
    </div>
  );
}
