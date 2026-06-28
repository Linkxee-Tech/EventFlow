'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

interface Sale {
  orderId: string;
  buyerName: string;
  totalAmount: number;
  createdAt: string;
}

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [sales, setSales] = useState<Sale[]>([]);
  const [open, setOpen] = useState(false);
  const lastSeenRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function pollSales() {
    try {
      const res = await fetch('/api/notifications/sales', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const newSales: Sale[] = json.data ?? [];

      if (lastSeenRef.current === null) {
        // First load — just set baseline, don't show notifications
        lastSeenRef.current = newSales[0]?.createdAt ?? '';
        setSales(newSales);
        return;
      }

      const fresh = newSales.filter(
        (s) => s.createdAt > (lastSeenRef.current ?? '')
      );

      if (fresh.length > 0) {
        setSales(newSales);
        setUnread((n) => n + fresh.length);
        fresh.forEach((s) => {
          toast.success(
            `🎟 New sale — ${s.buyerName} ($${(s.totalAmount / 100).toFixed(2)})`,
            { duration: 4000 }
          );
        });
        lastSeenRef.current = newSales[0]?.createdAt ?? lastSeenRef.current;
      }
    } catch {
      // Silent — polling errors should not interrupt the UX
    }
  }

  useEffect(() => {
    pollSales();
    timerRef.current = setInterval(pollSales, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleOpen() {
    setOpen((o) => !o);
    setUnread(0);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 bg-[#1A1A2E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Recent sales</span>
            <span className="text-[10px] text-slate-400">Auto-refreshes</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {sales.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No sales yet
              </div>
            ) : (
              sales.map((sale) => (
                <div
                  key={sale.orderId}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs shrink-0">
                    🎟
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{sale.buyerName}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(sale.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 shrink-0">
                    +${(sale.totalAmount / 100).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
