import { formatCents } from '@/lib/utils';
import { DollarSign, Ticket, CalendarCheck, TrendingUp } from 'lucide-react';

interface Props {
  totalRevenue: number;
  totalSold: number;
  activeEvents: number;
  totalEvents: number;
}

export function SalesMetrics({ totalRevenue, totalSold, activeEvents, totalEvents }: Props) {
  const metrics = [
    {
      label: 'Total Revenue',
      value: formatCents(totalRevenue),
      change: '+18% vs last month',
      up: true,
      icon: DollarSign,
      iconBg: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      label: 'Tickets Sold',
      value: totalSold.toLocaleString(),
      change: '+24% vs last month',
      up: true,
      icon: Ticket,
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      label: 'Active Events',
      value: String(activeEvents),
      change: `${totalEvents} total`,
      up: null,
      icon: CalendarCheck,
      iconBg: 'bg-amber-500/10 text-amber-500',
    },
    {
      label: 'Platform Fee',
      value: '2.5%',
      change: 'vs 10%+ Eventbrite',
      up: true,
      icon: TrendingUp,
      iconBg: 'bg-purple-500/10 text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {metrics.map(({ label, value, change, up, icon: Icon, iconBg }) => (
        <div key={label} className="bg-card border rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
              {label}
            </p>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p
            className={`text-[11px] mt-1 ${
              up === true
                ? 'text-emerald-500'
                : up === false
                ? 'text-red-400'
                : 'text-muted-foreground'
            }`}
          >
            {up === true ? '↑ ' : up === false ? '↓ ' : ''}{change}
          </p>
        </div>
      ))}
    </div>
  );
}
