import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEvent, listTicketsByEvent, updateEventStatus } from '@/lib/db';
import { formatCents, formatEventDate } from '@/lib/utils';
import { AttendeeList } from '@/components/dashboard/AttendeeList';
import Link from 'next/link';
import { ArrowLeft, Edit3, ScanLine, Globe, Trash2, Users, DollarSign, Ticket } from 'lucide-react';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getEvent(resolvedParams.id);
  return { title: event ? `${event.name} — Dashboard` : 'Event' };
}

export default async function EventDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? '';

  const event = await getEvent(resolvedParams.id);
  if (!event) notFound();
  if (event.organizerId !== userId) redirect('/dashboard/events');

  const tickets = await listTicketsByEvent(resolvedParams.id);
  const paid = tickets.filter((t) => t.status === 'paid' || t.status === 'used');
  const checkedIn = tickets.filter((t) => t.status === 'used');
  const totalRevenue = paid.reduce((s, t) => s + t.pricePaid, 0);

  const STATUS_COLORS = {
    published: 'bg-emerald-500/10 text-emerald-400',
    draft: 'bg-slate-500/10 text-slate-400',
    ended: 'bg-slate-700/20 text-slate-500',
    cancelled: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/events" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          All events
        </Link>
        <div className="flex items-center gap-2">
          {event.status === 'published' && (
            <Link
              href={`/dashboard/events/${event.id}/scan`}
              className="flex items-center gap-1.5 text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ScanLine className="h-3.5 w-3.5" />
              Scanner
            </Link>
          )}
          <Link
            href={`/events/${event.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            View page
          </Link>
          <Link
            href={`/dashboard/events/${event.id}/edit`}
            className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Link>
          {event.status !== 'cancelled' && (
            <form action={async () => {
              'use server';
              await updateEventStatus(event.id, 'cancelled');
              revalidatePath(`/dashboard/events/${event.id}`);
            }}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Cancel Event
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <h1 className="text-2xl font-semibold tracking-tight flex-1">{event.name}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[event.status]}`}>
            {event.status === 'published' ? '● Live' : event.status}
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">{formatEventDate(event.date)} · {event.venue}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: DollarSign, label: 'Revenue', value: formatCents(totalRevenue), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: Ticket, label: 'Tickets sold', value: String(paid.length), color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { icon: Users, label: 'Checked in', value: `${checkedIn.length} / ${paid.length}`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-[#1A1A2E] border border-white/8 rounded-xl p-4">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Ticket tiers */}
      <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl mb-6">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-medium">Ticket tiers</h2>
        </div>
        <div className="divide-y divide-white/5">
          {event.tiers.map((tier) => {
            const pct = tier.totalCapacity > 0 ? Math.round((tier.soldCount / tier.totalCapacity) * 100) : 0;
            return (
              <div key={tier.tierId} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{tier.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatCents(tier.price)} each · max {tier.maxPerOrder} per order</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{tier.soldCount} / {tier.totalCapacity}</p>
                  <div className="w-24 h-1.5 bg-white/8 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attendee list */}
      <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-sm font-medium">Attendees ({paid.length})</h2>
          <span className="text-xs text-slate-500">{checkedIn.length} checked in</span>
        </div>
        <AttendeeList tickets={paid} tiers={event.tiers} eventId={event.id} />
      </div>
    </div>
  );
}
