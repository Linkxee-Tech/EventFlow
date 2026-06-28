'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Ticket, TicketTier } from '@/types';
import { CheckCircle2, Circle, Undo2, Loader2 } from 'lucide-react';

interface Props {
  tickets: Ticket[];
  tiers: TicketTier[];
  eventId: string;
}

export function AttendeeList({ tickets: initialTickets, tiers, eventId }: Props) {
  const [tickets, setTickets] = useState(initialTickets);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  if (tickets.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 text-sm">
        No tickets sold yet. Share your event to start selling.
      </div>
    );
  }

  async function toggleCheckIn(ticket: Ticket) {
    const already = ticket.status === 'used';
    // Optimistic update
    setTickets((prev) =>
      prev.map((t) =>
        t.ticketId === ticket.ticketId
          ? { ...t, status: already ? 'paid' : 'used', checkedInAt: already ? undefined : new Date().toISOString() }
          : t
      )
    );

    try {
      const res = await fetch('/api/tickets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.ticketId,
          eventId,
          qrHash: ticket.qrHash, // pass stored hash for manual toggle
          manualOverride: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Revert
        setTickets((prev) =>
          prev.map((t) => (t.ticketId === ticket.ticketId ? ticket : t))
        );
        toast.error(json.error ?? 'Check-in failed');
      } else {
        toast.success(already ? 'Check-in reversed' : `✓ ${ticket.buyerName} checked in`);
      }
    } catch {
      setTickets((prev) =>
        prev.map((t) => (t.ticketId === ticket.ticketId ? ticket : t))
      );
      toast.error('Network error. Try again.');
    }
  }

  async function handleRefund(ticket: Ticket) {
    if (!confirm(`Are you sure you want to refund ${ticket.buyerName}? This will invalidate their ticket.`)) return;
    
    setRefundingId(ticket.ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticket.ticketId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Refund failed');
      } else {
        toast.success(`Refunded ${ticket.buyerName} successfully`);
        setTickets(prev => prev.filter(t => t.ticketId !== ticket.ticketId));
      }
    } catch {
      toast.error('Network error. Try again.');
    } finally {
      setRefundingId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left text-[11px] text-slate-500 font-medium px-5 py-3 uppercase tracking-wider">Attendee</th>
            <th className="text-left text-[11px] text-slate-500 font-medium px-5 py-3 uppercase tracking-wider hidden md:table-cell">Tier</th>
            <th className="text-left text-[11px] text-slate-500 font-medium px-5 py-3 uppercase tracking-wider hidden lg:table-cell">Ticket ID</th>
            <th className="text-center text-[11px] text-slate-500 font-medium px-5 py-3 uppercase tracking-wider">Checked In</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {tickets.map((ticket) => {
            const tier = tiers.find((t) => t.tierId === ticket.tierId);
            const isCheckedIn = ticket.status === 'used';
            return (
              <tr key={ticket.ticketId} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-white">{ticket.buyerName}</p>
                  <p className="text-xs text-slate-500">{ticket.buyerEmail}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-400 hidden md:table-cell">
                  {tier?.name ?? '—'}
                </td>
                <td className="px-5 py-3.5 text-xs font-mono text-slate-500 hidden lg:table-cell">
                  #{ticket.ticketId.slice(-8).toUpperCase()}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => toggleCheckIn(ticket)}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                      isCheckedIn
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500/30'
                    }`}
                    title={isCheckedIn ? 'Click to reverse check-in' : 'Click to check in'}
                  >
                    {isCheckedIn ? (
                      <><CheckCircle2 className="h-3 w-3" /> Checked in</>
                    ) : (
                      <><Circle className="h-3 w-3" /> Check in</>
                    )}
                  </button>
                  <button
                    onClick={() => handleRefund(ticket)}
                    disabled={refundingId === ticket.ticketId}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all bg-white/5 border-white/10 text-red-400 hover:border-red-500/30 disabled:opacity-50 ml-2"
                    title="Refund ticket"
                  >
                    {refundingId === ticket.ticketId ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Refunding</>
                    ) : (
                      <><Undo2 className="h-3 w-3" /> Refund</>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
