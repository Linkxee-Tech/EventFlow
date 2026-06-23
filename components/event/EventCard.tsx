import Link from 'next/link';
import { formatEventDate, formatCents } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin } from 'lucide-react';
import type { Event } from '@/types';

const statusConfig = {
  published: { label: '● Live', variant: 'default' as const, color: 'text-emerald-500' },
  draft: { label: 'Draft', variant: 'secondary' as const, color: 'text-muted-foreground' },
  ended: { label: 'Ended', variant: 'outline' as const, color: 'text-muted-foreground' },
  cancelled: { label: 'Cancelled', variant: 'destructive' as const, color: 'text-red-400' },
};

interface Props { event: Event }

export function EventCard({ event }: Props) {
  const totalSold = event.tiers.reduce((s, t) => s + t.soldCount, 0);
  const totalCap = event.tiers.reduce((s, t) => s + t.totalCapacity, 0);
  const revenue = event.tiers.reduce((s, t) => s + t.soldCount * t.price, 0);
  const pct = totalCap > 0 ? Math.round((totalSold / totalCap) * 100) : 0;
  const cfg = statusConfig[event.status];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 transition-all hover:-translate-y-0.5 group">
      {/* Thumb */}
      <div className="h-24 bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center text-4xl">
        🎟
      </div>

      <div className="p-4">
        <h3 className="font-medium text-sm truncate mb-1">{event.name}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Calendar className="h-3 w-3" />
          <span className="truncate">{formatEventDate(event.date)}</span>
        </div>

        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalSold} / {totalCap} tickets</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1" />
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center justify-between">
        <Badge variant={cfg.variant} className="text-[10px]">
          {cfg.label}
        </Badge>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{formatCents(revenue)}</span>
          <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
            <Link href={`/dashboard/events/${event.id}`}>Manage →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
