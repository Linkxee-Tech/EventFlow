import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listOrdersByBuyerEmail, getEvent } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatEventDate, formatCents } from '@/lib/utils';
import { Ticket, Calendar, MapPin, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Tickets — EventFlow',
};

export default async function MyTicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/login');
  }

  const orders = await listOrdersByBuyerEmail(session.user.email);
  
  // Fetch event details for each order
  const eventsMap = new Map();
  await Promise.all(
    orders.map(async (order) => {
      if (!eventsMap.has(order.eventId)) {
        const event = await getEvent(order.eventId);
        if (event) eventsMap.set(order.eventId, event);
      }
    })
  );

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-base">🎟</div>
          <span className="font-semibold tracking-tight">EventFlow</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">My Tickets</h1>
          <p className="text-slate-400">View and manage your upcoming event tickets.</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl bg-[#1A1A2E]">
            <Ticket className="h-12 w-12 text-slate-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No tickets yet</h3>
            <p className="text-slate-400 text-sm mb-6">You haven't purchased any tickets for upcoming events.</p>
            <Link
              href="/#events"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => {
              const event = eventsMap.get(order.eventId);
              if (!event) return null;

              return (
                <Link
                  key={order.orderId}
                  href={`/confirmation/${order.orderId}`}
                  className="group block bg-[#1A1A2E] border border-white/8 hover:border-indigo-500/50 rounded-2xl p-5 md:p-6 transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {event.imageUrl ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 hidden sm:block">
                          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 hidden sm:flex">
                          <Calendar className="h-6 w-6 text-indigo-400" />
                        </div>
                      )}
                      
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 mb-2">
                          {order.tickets.length} Ticket{order.tickets.length !== 1 && 's'}
                        </div>
                        <h3 className="text-lg font-semibold group-hover:text-indigo-300 transition-colors">
                          {event.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatEventDate(event.date)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.venue}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-3 md:pl-6 md:border-l md:border-white/10 shrink-0">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Order Total</p>
                        <p className="font-semibold text-emerald-400">{formatCents(order.totalAmount)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-indigo-400 group-hover:text-indigo-300 transition-colors">
                        View QR Code <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
