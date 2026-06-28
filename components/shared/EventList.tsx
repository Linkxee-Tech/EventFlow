'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { formatCents, formatEventDate } from '@/lib/utils';
import type { Event } from '@/types';

export function EventList({ events }: { events: Event[] }) {
  const [search, setSearch] = useState('');

  const filteredEvents = events.filter((event) => {
    const term = search.toLowerCase();
    return event.name.toLowerCase().includes(term) || event.venue.toLowerCase().includes(term);
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold">Upcoming events</h2>
          <span className="text-sm text-slate-400">{events.length} events live</span>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search events or venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl text-slate-500">
          <p>No events found.</p>
          {events.length === 0 && (
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
              Be the first to create one →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => {
            const minPrice = Math.min(...event.tiers.map((t) => t.price));
            const totalAvail = event.tiers.reduce((s, t) => s + t.availableCount, 0);
            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group bg-[#1A1A2E] border border-white/8 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all hover:-translate-y-0.5"
              >
                <div className="h-32 bg-gradient-to-br from-indigo-900/40 to-purple-900/30 flex items-center justify-center text-5xl">
                  🎟
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-sm truncate mb-1 group-hover:text-indigo-300 transition-colors">
                    {event.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <Calendar className="h-3 w-3" />
                    <span className="truncate">{formatEventDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {minPrice === 0 ? 'Free' : `From ${formatCents(minPrice)}`}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      totalAvail === 0
                        ? 'bg-red-500/10 text-red-400'
                        : totalAvail < 20
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {totalAvail === 0 ? 'Sold out' : totalAvail < 20 ? `${totalAvail} left` : 'Available'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
