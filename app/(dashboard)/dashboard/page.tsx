import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listEventsByOrganizer, listRecentOrdersByOrganizer } from '@/lib/db';
import { formatCents } from '@/lib/utils';
import { EventCard } from '@/components/event/EventCard';
import { SalesMetrics } from '@/components/dashboard/SalesMetrics';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { SectionErrorBoundary } from '@/components/shared/ErrorBoundary';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export const metadata = { title: 'Dashboard — EventFlow' };
// Revalidate every 30s so activity feed stays fresh without full client polling
export const revalidate = 30;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? '';

  // Promise.all — parallel queries, not sequential (Phase 3 requirement)
  const [events, recentOrders] = await Promise.all([
    listEventsByOrganizer(userId),
    listRecentOrdersByOrganizer(userId, 5),
  ]);

  const published = events.filter((e) => e.status === 'published');
  const totalSold = events.reduce(
    (sum, e) => sum + e.tiers.reduce((s, t) => s + t.soldCount, 0), 0
  );
  const totalRevenue = events.reduce(
    (sum, e) => sum + e.tiers.reduce((s, t) => s + t.soldCount * t.price, 0), 0
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Welcome back, {session?.user?.name?.split(' ')[0] ?? 'Organizer'}
          </p>
        </div>
        <Link
          href="/dashboard/events/create"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          New Event
        </Link>
      </div>

      {/* KPI metrics — parallel fetched */}
      <SectionErrorBoundary label="metrics">
        <SalesMetrics
          totalRevenue={totalRevenue}
          totalSold={totalSold}
          activeEvents={published.length}
          totalEvents={events.length}
        />
      </SectionErrorBoundary>

      {/* Revenue chart + Activity feed side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <SectionErrorBoundary label="revenue chart">
          <RevenueChart events={events} />
        </SectionErrorBoundary>

        <SectionErrorBoundary label="activity feed">
          <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl">
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-sm font-medium">Recent sales</h2>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <div className="px-4 py-1">
              <ActivityFeed orders={recentOrders} />
            </div>
          </div>
        </SectionErrorBoundary>
      </div>

      {/* Recent events grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Your events</h2>
          <Link
            href="/dashboard/events"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all →
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
            <p className="text-3xl mb-3">🎟</p>
            <p className="text-slate-400 text-sm mb-4">No events yet</p>
            <Link
              href="/dashboard/events/create"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {events.slice(0, 6).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
