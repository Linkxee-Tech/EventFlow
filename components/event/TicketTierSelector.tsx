'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatCents, calculateFee } from '@/types';
import type { Event, TicketTier } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Props {
  event: Event;
}

export function TicketTierSelector({ event }: Props) {
  const router = useRouter();
  const [selectedTierId, setSelectedTierId] = useState<string>(
    event.tiers[0]?.tierId ?? ''
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const selectedTier = event.tiers.find((t) => t.tierId === selectedTierId);
  const fees = selectedTier ? calculateFee(selectedTier.price, quantity) : null;

  async function handleBuy() {
    if (!selectedTier) return;
    setLoading(true);

    const email = prompt('Enter your email to continue:');
    if (!email) { setLoading(false); return; }
    const name = prompt('Your full name:');
    if (!name) { setLoading(false); return; }

    try {
      const res = await fetch('/api/tickets/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          tierId: selectedTier.tierId,
          quantity,
          buyerEmail: email,
          buyerName: name,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Could not reserve tickets');
        return;
      }

      router.push(
        `/checkout/${event.id}?reservation=${json.data.reservationId}&secret=${json.data.paymentIntentClientSecret}`
      );
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {event.tiers.map((tier) => {
        const pct = Math.round((tier.soldCount / tier.totalCapacity) * 100);
        const almostGone = tier.availableCount > 0 && tier.availableCount <= 10;
        const soldOut = tier.availableCount === 0;
        const selected = tier.tierId === selectedTierId;

        return (
          <div
            key={tier.tierId}
            onClick={() => !soldOut && setSelectedTierId(tier.tierId)}
            className={`
              border rounded-xl p-4 cursor-pointer transition-all
              ${soldOut ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
              ${selected && !soldOut ? 'border-primary bg-primary/5' : 'border-border bg-card'}
            `}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{tier.name}</span>
                  {almostGone && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px]">
                      Only {tier.availableCount} left
                    </Badge>
                  )}
                  {soldOut && <Badge variant="secondary" className="text-[10px]">Sold out</Badge>}
                </div>
                {tier.description && (
                  <p className="text-xs text-muted-foreground">{tier.description}</p>
                )}
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{tier.soldCount} / {tier.totalCapacity} sold</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1" />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-bold">{formatCents(tier.price)}</div>
                <div className="text-xs text-muted-foreground">per ticket</div>
              </div>
            </div>
          </div>
        );
      })}

      {selectedTier && (
        <div className="bg-card border rounded-xl p-4 space-y-4 mt-6">
          {/* Quantity selector */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{selectedTier.name}</div>
              <div className="text-xs text-muted-foreground">
                Max {selectedTier.maxPerOrder} per order
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="w-8 h-8 rounded-lg border bg-muted flex items-center justify-center text-lg font-medium hover:bg-muted/80 disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                className="w-8 h-8 rounded-lg border bg-muted flex items-center justify-center text-lg font-medium hover:bg-muted/80 disabled:opacity-40"
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(
                      selectedTier.maxPerOrder,
                      Math.min(selectedTier.availableCount, q + 1)
                    )
                  )
                }
                disabled={
                  quantity >= selectedTier.maxPerOrder ||
                  quantity >= selectedTier.availableCount
                }
              >
                +
              </button>
            </div>
          </div>

          {/* Fee breakdown */}
          {fees && (
            <div className="text-sm space-y-1 border-t pt-3">
              <div className="flex justify-between text-muted-foreground">
                <span>{selectedTier.name} × {quantity}</span>
                <span>{formatCents(fees.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  Platform fee
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    2.5% + $0.30
                  </span>
                </span>
                <span>{formatCents(fees.platformFee)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t">
                <span>Total</span>
                <span>{formatCents(fees.total)}</span>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleBuy}
            disabled={loading || selectedTier.availableCount === 0}
          >
            {loading ? 'Reserving...' : `Buy Tickets — ${fees ? formatCents(fees.total) : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
