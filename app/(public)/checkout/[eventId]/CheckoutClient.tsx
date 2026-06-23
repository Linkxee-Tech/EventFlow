'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatCents } from '@/lib/utils';
import { calculateFee } from '@/types';
import type { Event, TicketTier } from '@/types';
import { Lock, Clock, AlertCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

// ─── Countdown Timer ──────────────────────────────────────────────────────────

function useCountdown(durationSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  return { secondsLeft, display: `${mins}:${secs}` };
}

// ─── Inner payment form (needs Stripe context) ────────────────────────────────

interface PaymentFormProps {
  reservationId: string;
  event: Event;
  tier: TicketTier;
  quantity: number;
  onSuccess: (orderId: string) => void;
}

function PaymentForm({ reservationId, event, tier, quantity, onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const fees = calculateFee(tier.price, quantity);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !name || !email) return;

    setProcessing(true);
    setErrorMsg('');

    try {
      // 1. Submit elements (validates card)
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMsg(submitError.message ?? 'Card validation failed.');
        return;
      }

      // 2. Confirm via our API (idempotent with reservationId as key)
      const confirmRes = await fetch('/api/tickets/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          buyerEmail: email,
          buyerName: name,
          eventId: event.id,
        }),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok) {
        setErrorMsg(confirmJson.error ?? 'Payment could not be processed.');
        return;
      }

      const { clientSecret, orderId } = confirmJson.data;

      // 3. Confirm payment with Stripe
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/confirmation/${orderId}`,
          payment_method_data: {
            billing_details: { name, email },
          },
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setErrorMsg(confirmError.message ?? 'Payment failed. Please try again.');
      } else {
        toast.success('Payment successful! Sending your tickets…');
        onSuccess(orderId);
      }
    } catch (err: any) {
      setErrorMsg('Network error. Your card has not been charged. Please try again.');
      toast.error('Network error. Please check your connection.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Buyer details */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Your details</h3>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Full name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amara Okonkwo"
              required
              className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Email — tickets sent here *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="amara@example.com"
              required
              className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Billing address */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Billing address</h3>
        <AddressElement
          options={{
            mode: 'billing',
            fields: { phone: 'never' },
          }}
        />
      </div>

      {/* Card */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Payment</h3>
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
          }}
        />
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={processing || !stripe || !name || !email}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
      >
        {processing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Pay {formatCents(fees.total)} securely
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-600">
        <Lock className="inline h-3 w-3 mr-1" />
        Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}

// ─── Checkout overlay spinner ─────────────────────────────────────────────────

function FullscreenSpinner({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 bg-[#0F0F1A]/95 z-50 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-white font-medium">{message}</p>
    </div>
  );
}

// ─── Main exported component ─────────────────────────────────────────────────

export interface CheckoutClientProps {
  event: Event;
  tier: TicketTier;
  quantity: number;
  reservationId: string;
  clientSecret: string;
  stripePublishableKey: string;
}

export function CheckoutClient({
  event,
  tier,
  quantity,
  reservationId,
  clientSecret,
  stripePublishableKey,
}: CheckoutClientProps) {
  const router = useRouter();
  const { secondsLeft, display } = useCountdown(10 * 60); // 10-minute hold
  const [redirecting, setRedirecting] = useState(false);
  const fees = calculateFee(tier.price, quantity);

  const stripePromise = loadStripe(stripePublishableKey);

  const isExpired = secondsLeft <= 0;
  const isUrgent = secondsLeft <= 60;

  function handleSuccess(orderId: string) {
    setRedirecting(true);
    router.push(`/confirmation/${orderId}`);
  }

  if (redirecting) {
    return <FullscreenSpinner message="Confirming your tickets…" />;
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link
          href={`/events/${event.slug}`}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to event
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-indigo-500 rounded-md flex items-center justify-center text-sm">🎟</div>
          <span className="font-semibold text-sm">EventFlow</span>
        </div>
      </div>

      {/* Countdown banner */}
      <div className={`border-b px-4 py-2.5 flex items-center justify-center gap-2 text-sm transition-colors ${
        isExpired
          ? 'bg-red-500/10 border-red-500/20 text-red-400'
          : isUrgent
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
      }`}>
        <Clock className="h-4 w-4" />
        {isExpired
          ? '⚠️ Your hold has expired. Please go back and reserve again.'
          : `Holding ${quantity} ticket${quantity > 1 ? 's' : ''} for ${display} — complete checkout to secure them.`
        }
      </div>

      {isExpired ? (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <p className="text-slate-400 mb-4">Your ticket hold expired. Go back and try again.</p>
          <Link
            href={`/events/${event.slug}`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors inline-block"
          >
            Back to event
          </Link>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-[1fr_340px] gap-8">
          {/* Left: Form */}
          <div>
            <h1 className="text-xl font-semibold mb-6">Complete your purchase</h1>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#6366F1',
                    colorBackground: '#0F0F1A',
                    colorText: '#F1F5F9',
                    colorDanger: '#EF4444',
                    fontFamily: '-apple-system, system-ui, sans-serif',
                    borderRadius: '10px',
                  },
                },
              }}
            >
              <PaymentForm
                reservationId={reservationId}
                event={event}
                tier={tier}
                quantity={quantity}
                onSuccess={handleSuccess}
              />
            </Elements>
          </div>

          {/* Right: Order summary */}
          <div className="order-first md:order-last">
            <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-5 sticky top-4">
              <h2 className="text-sm font-medium mb-4">Order summary</h2>

              <div className="border-b border-white/8 pb-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-lg shrink-0">🎟</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{tier.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>{tier.name} × {quantity}</span>
                  <span>{formatCents(fees.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    Platform fee
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded-full">
                      2.5% + $0.30
                    </span>
                  </span>
                  <span>{formatCents(fees.platformFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base border-t border-white/8 pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatCents(fees.total)}</span>
                </div>
              </div>

              <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-400">
                💚 Saving vs Eventbrite: ~{formatCents(Math.round(fees.subtotal * 0.07))} in fees on this order
              </div>

              <div className="mt-4 space-y-1.5">
                {['No hidden fees', 'Instant ticket delivery by email', '2.5% flat platform fee'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="text-emerald-500">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky CTA (visible only on mobile, hidden when form is active) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F0F1A]/95 backdrop-blur border-t border-white/8 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">{quantity} ticket{quantity > 1 ? 's' : ''}</p>
          <p className="font-semibold">{formatCents(fees.total)}</p>
        </div>
        <div className={`text-xs flex items-center gap-1 ${isUrgent ? 'text-amber-400' : 'text-slate-400'}`}>
          <Clock className="h-3 w-3" />
          {display}
        </div>
      </div>
    </div>
  );
}
