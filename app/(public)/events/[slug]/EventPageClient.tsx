'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatCents, formatEventDate } from '@/lib/utils';
import { calculateFee } from '@/types';
import { AvailabilityPoller, useAvailability } from '@/components/event/AvailabilityPoller';
import type { Event, TicketTier } from '@/types';
import { Calendar, MapPin, Users, ChevronDown, Lock, AlertCircle } from 'lucide-react';

interface Props { event: Event }

export function EventPageClient({ event }: Props) {
  const router = useRouter();
  const [selectedTierId, setSelectedTierId] = useState(event.tiers[0]?.tierId ?? '');
  const [quantity, setQuantity] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [showStickyBtn, setShowStickyBtn] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);

  const { availability, handleUpdate } = useAvailability(event.slug, event.tiers);
  const selectedTier = event.tiers.find((t) => t.tierId === selectedTierId);
  const tierAvailability = selectedTier ? availability[selectedTier.tierId] : null;
  const soldOut = tierAvailability?.soldOut ?? false;
  const fees = selectedTier && !soldOut ? calculateFee(selectedTier.price, quantity) : null;

  // Sticky CTA: show when the buy section scrolls out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBtn(!entry.isIntersecting),
      { rootMargin: '-80px 0px 0px 0px' }
    );
    if (buyRef.current) observer.observe(buyRef.current);
    return () => observer.disconnect();
  }, []);

  async function handleReserve() {
    if (!selectedTier || soldOut) return;

    const email = window.prompt('Enter your email to continue:');
    if (!email?.includes('@')) { toast.error('Please enter a valid email'); return; }
    const name = window.prompt('Your full name:');
    if (!name?.trim()) { toast.error('Name is required'); return; }

    setReserving(true);
    try {
      const res = await fetch('/api/tickets/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          tierId: selectedTier.tierId,
          quantity,
          buyerEmail: email.trim(),
          buyerName: name.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Could not reserve tickets. Please try again.');
        return;
      }

      toast.success('Tickets reserved! Complete checkout within 10 minutes.');
      router.push(
        `/checkout/${event.id}?reservation=${json.data.reservationId}` +
        `&secret=${encodeURIComponent(json.data.paymentIntentClientSecret)}` +
        `&tierId=${selectedTier.tierId}&qty=${quantity}`
      );
    } catch {
      toast.error('Network error. Please refresh and try again.');
    } finally {
      setReserving(false);
    }
  }

  const totalAttending = event.tiers.reduce((s, t) => s + t.soldCount, 0);

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white pb-24 md:pb-0">
      {/* Live polling — invisible behaviour component */}
      <AvailabilityPoller slug={event.slug} tiers={event.tiers} onUpdate={handleUpdate} />

      {/* Hero */}
      <div className="bg-gradient-to-b from-indigo-950/50 to-[#0F0F1A] pt-10 pb-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">🎟</div>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
            <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-medium">
              ● Live
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              {formatEventDate(event.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {event.venue}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 shrink-0" />
              {totalAttending} attending
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed text-sm max-w-xl">{event.description}</p>
        </div>
      </div>

      {/* Venue map placeholder */}
      <div className="max-w-2xl mx-auto px-4 mb-6">
        <div className="h-28 bg-[#1A1A2E] border border-white/8 rounded-xl flex items-center justify-center gap-2 text-slate-500 text-sm">
          <MapPin className="h-4 w-4" />
          {event.venue}
        </div>
      </div>

      {/* Ticket tiers + buy section */}
      <div className="max-w-2xl mx-auto px-4 pb-8" ref={buyRef}>
        <h2 className="text-base font-medium mb-3">Choose your tickets</h2>

        <div className="space-y-2.5 mb-5">
          {event.tiers.map((tier) => {
            const avail = availability[tier.tierId];
            const pct = avail
              ? Math.round(((avail.total - avail.available) / avail.total) * 100)
              : Math.round((tier.soldCount / tier.totalCapacity) * 100);
            const isSoldOut = avail?.soldOut ?? tier.availableCount === 0;
            const isAlmostGone = !isSoldOut && (avail?.available ?? tier.availableCount) <= 10;
            const isSelected = tier.tierId === selectedTierId;

            return (
              <div
                key={tier.tierId}
                onClick={() => !isSoldOut && setSelectedTierId(tier.tierId)}
                className={[
                  'border rounded-xl p-4 transition-all cursor-pointer',
                  isSoldOut ? 'opacity-50 cursor-not-allowed border-white/8 bg-white/[0.02]'
                    : isSelected ? 'border-indigo-500 bg-indigo-500/8'
                    : 'border-white/10 bg-[#1A1A2E] hover:border-white/20',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{tier.name}</span>
                      {isSoldOut && (
                        <span className="text-[10px] bg-slate-700/40 text-slate-400 px-1.5 py-0.5 rounded-full">
                          Sold out
                        </span>
                      )}
                      {isAlmostGone && !isSoldOut && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                          Only {avail?.available ?? tier.availableCount} left
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-xs text-slate-400 mb-2">{tier.description}</p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>{avail?.total - avail?.available ?? tier.soldCount} / {avail?.total ?? tier.totalCapacity} sold</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: isSoldOut ? '#EF4444' : isAlmostGone ? '#F59E0B' : '#6366F1',
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold">{formatCents(tier.price)}</div>
                    <div className="text-[10px] text-slate-500">per ticket</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quantity + buy panel */}
        {selectedTier && !soldOut && (
          <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{selectedTier.name}</p>
                <p className="text-xs text-slate-400">Max {selectedTier.maxPerOrder} per order</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg hover:bg-white/10 disabled:opacity-40 transition-colors"
                >−</button>
                <span className="w-5 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(
                    selectedTier.maxPerOrder,
                    Math.min(tierAvailability?.available ?? selectedTier.availableCount, q + 1)
                  ))}
                  disabled={quantity >= selectedTier.maxPerOrder || quantity >= (tierAvailability?.available ?? selectedTier.availableCount)}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg hover:bg-white/10 disabled:opacity-40 transition-colors"
                >+</button>
              </div>
            </div>

            {fees && (
              <div className="space-y-1.5 text-sm border-t border-white/8 pt-3">
                <div className="flex justify-between text-slate-400">
                  <span>{selectedTier.name} × {quantity}</span>
                  <span>{formatCents(fees.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    Platform fee
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded-full">2.5% + $0.30</span>
                  </span>
                  <span>{formatCents(fees.platformFee)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-white/8 pt-2">
                  <span>Total</span>
                  <span>{formatCents(fees.total)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleReserve}
              disabled={reserving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {reserving ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Reserving…</>
              ) : (
                <><Lock className="h-4 w-4" />Reserve Tickets — {fees ? formatCents(fees.total) : ''}</>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-600">
              Transparent pricing · 2.5% + $0.30 platform fee · No hidden charges
            </p>
          </div>
        )}

        {soldOut && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            This ticket tier is sold out. Check other tiers above.
          </div>
        )}
      </div>

      {/* Sticky mobile CTA — Phase 2 + Phase 9 */}
      {showStickyBtn && selectedTier && !soldOut && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0F0F1A]/95 backdrop-blur border-t border-white/8 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-slate-400 leading-none mb-0.5">{selectedTier.name} × {quantity}</p>
            <p className="font-bold text-base leading-none">{fees ? formatCents(fees.total) : ''}</p>
          </div>
          <button
            onClick={handleReserve}
            disabled={reserving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm shrink-0"
          >
            {reserving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : '🎟 Buy Tickets'
            }
          </button>
        </div>
      )}
    </div>
  );
}
