import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listEventsByOrganizer } from '@/lib/db';
import { formatCents, formatEventDate } from '@/lib/utils';
import Link from 'next/link';
import { PlusCircle, Search } from 'lucide-react';
import type { Metadata } from 'next';
import type { Event } from '@/types';

export const metadata: Metadata = { title: 'My Events' };

const STATUS_STYLES: Record<Event['status'], string> = {
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  ended: 'bg-slate-700/20 text-slate-500 border-slate-700/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_LABELS: Record<Event['status'], string> = {
  published: '● Live',
  draft: 'Draft',
  ended: 'Ended',
  cancelled: 'Cancelled',
};

export default async function EventsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? '';
  const events = await listEventsByOrganizer(userId);

  const stats = {
    total: events.length,
    live: events.filter((e) => e.status === 'published').length,
    draft: events.filter((e) => e.status === 'draft').length,
    ended: events.filter((e) => e.status === 'ended').length,
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Events</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {stats.total} total · {stats.live} live · {stats.draft} drafts
          </p>
        </div>
        <Link
          href="/dashboard/events/create"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
          <p className="text-4xl mb-4">🎟</p>
          <h3 className="font-medium text-white mb-2">No events yet</h3>
          <p className="text-sm text-slate-400 mb-5">Create your first event and start selling tickets in minutes.</p>
          <Link
            href="/dashboard/events/create"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left text-xs text-slate-500 font-medium px-5 py-3.5 uppercase tracking-wider">Event</th>
                <th className="text-left text-xs text-slate-500 font-medium px-5 py-3.5 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-left text-xs text-slate-500 font-medium px-5 py-3.5 uppercase tracking-wider">Status</th>
                <th className="text-right text-xs text-slate-500 font-medium px-5 py-3.5 uppercase tracking-wider hidden lg:table-cell">Sold</th>
                <th className="text-right text-xs text-slate-500 font-medium px-5 py-3.5 uppercase tracking-wider">Revenue</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((event) => {
                const totalSold = event.tiers.reduce((s, t) => s + t.soldCount, 0);
                const totalCap = event.tiers.reduce((s, t) => s + t.totalCapacity, 0);
                const revenue = event.tiers.reduce((s, t) => s + t.soldCount * t.price, 0);
                return (
                  <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-sm shrink-0">🎟</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate max-w-[200px]">{event.name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{event.venue}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 hidden md:table-cell">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_STYLES[event.status]}`}>
                        {STATUS_LABELS[event.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-400 hidden lg:table-cell">
                      {totalSold} / {totalCap}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-white">
                      {revenue > 0 ? formatCents(revenue) : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
