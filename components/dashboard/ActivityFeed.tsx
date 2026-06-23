import { formatCents } from '@/lib/utils';
import type { Order } from '@/types';

interface Props {
  orders: Order[];
}

export function ActivityFeed({ orders }: Props) {
  if (orders.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        No sales yet. Share your event to get your first ticket sold.
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {orders.map((order) => (
        <div key={order.orderId} className="flex items-center gap-3 py-3.5 px-1">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-sm">
            🎟
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{order.buyerName}</p>
            <p className="text-xs text-slate-500">
              {order.tickets.length} ticket{order.tickets.length !== 1 ? 's' : ''} ·{' '}
              {new Date(order.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span className="text-sm font-semibold text-emerald-400 shrink-0">
            +{formatCents(order.netToOrganizer)}
          </span>
        </div>
      ))}
    </div>
  );
}
