'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Event } from '@/types';

// Build last-7-days dummy data seeded from real event revenue
// In production, store daily snapshots in DynamoDB
function buildChartData(events: Event[]) {
  const totalRev = events.reduce(
    (sum, e) => sum + e.tiers.reduce((s, t) => s + t.soldCount * t.price, 0),
    0
  );
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
  const weights = [0.08, 0.12, 0.09, 0.15, 0.13, 0.19, 0.24];
  return days.map((day, i) => ({
    day,
    revenue: Math.round((totalRev * weights[i]) / 100) * 100,
  }));
}

interface Props { events: Event[] }

export function RevenueChart({ events }: Props) {
  const data = buildChartData(events);

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-medium">Revenue — last 7 days</h2>
        <span className="text-xs text-muted-foreground">Daily breakdown</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: '#1A1A2E',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => [`$${(v / 100).toFixed(2)}`, 'Revenue']}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#6366F1"
            strokeWidth={2}
            fill="url(#revenueGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#6366F1' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
