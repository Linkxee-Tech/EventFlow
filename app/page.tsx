import Link from 'next/link';
import { listPublishedEvents } from '@/lib/db';
import { formatCents, formatEventDate } from '@/lib/utils';
import { Calendar, MapPin, ArrowRight, Zap, Shield, DollarSign } from 'lucide-react';
import { EventList } from '@/components/shared/EventList';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EventFlow — Fair-Trade Ticketing',
  description: 'Sell tickets without losing 10%+ to fees. Flat 2.5% + $0.30. Atomic inventory. Direct payouts.',
};

export const revalidate = 60;

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  let events: any[] = [];
  try {
    events = await listPublishedEvents();
  } catch (err) {
    console.error('Failed to load events:', err);
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-base">🎟</div>
          <span className="font-semibold tracking-tight">EventFlow</span>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href="/my-tickets" className="text-sm text-slate-400 hover:text-white transition-colors">
                My Tickets
              </Link>
              <Link
                href="/dashboard"
                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Start selling
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs px-3 py-1.5 rounded-full mb-6">
          <Zap className="h-3 w-3" />
          2.5% flat fee — no surprise charges at checkout
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
          Ticketing that pays<br />
          <span className="text-indigo-400">the creator, not the platform</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
          Independent organizers lose 6–10% per ticket on Eventbrite. EventFlow charges 2.5% + $0.30.
          Real-time inventory that never oversells.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            Create your first event <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#events"
            className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl transition-colors border border-white/10"
          >
            Browse events
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-6 mt-10 text-sm text-slate-500">
          <span>🇳🇬 Lagos</span>
          <span>🇳🇬 Abuja</span>
          <span>🇿🇦 Cape Town</span>
          <span>🇬🇭 Accra</span>
          <span>+more</span>
        </div>
      </section>

      {/* Why EventFlow */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: DollarSign,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              title: '2.5% + $0.30 flat',
              body: 'No service fees. No payment processing markup. Just one transparent number shown at checkout.',
            },
            {
              icon: Zap,
              color: 'text-indigo-400',
              bg: 'bg-indigo-500/10',
              title: 'Atomic inventory',
              body: 'DynamoDB conditional writes prevent overselling even under 500 concurrent buyers. Zero double-sells.',
            },
            {
              icon: Shield,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
              title: 'Dynamic QR tickets',
              body: 'QR codes rotate every 30 seconds via HMAC hashing. Screenshots and forwarded tickets are useless.',
            },
          ].map(({ icon: Icon, color, bg, title, body }) => (
            <div key={title} className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-6">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Events grid */}
      <section id="events" className="max-w-6xl mx-auto px-6 pb-20">
        <EventList events={events} />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-slate-600">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-x-6 gap-y-2">
          <span>© 2026 EventFlow</span>
          <span>2.5% + $0.30 per ticket sold</span>
          <span>vs Eventbrite: 6–10% + $0.79+</span>
          <Link href="/login" className="hover:text-slate-400">Organizer login</Link>
        </div>
      </footer>
    </div>
  );
}
