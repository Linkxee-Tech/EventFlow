import Stripe from 'stripe';
import type { FeeBreakdown } from '@/types';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
});

// ─── Fee Calculation ──────────────────────────────────────────────────────────

export function calculateFees(pricePerTicket: number, quantity: number): FeeBreakdown {
  const subtotal = pricePerTicket * quantity;
  // 2.5% + $0.30 (30 cents)
  const platformFee = Math.round(subtotal * 0.025) + 30;
  return { subtotal, platformFee, total: subtotal + platformFee };
}

// ─── Payment Intent ───────────────────────────────────────────────────────────

export async function createPaymentIntent({
  amount,
  platformFee,
  organizerStripeAccountId,
  metadata,
}: {
  amount: number;
  platformFee: number;
  organizerStripeAccountId: string;
  metadata: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    return {
      id: `pi_mock_${Date.now()}`,
      client_secret: 'pi_mock_secret',
      status: 'requires_payment_method',
    } as any;
  }

  return stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    application_fee_amount: platformFee,
    transfer_data: {
      destination: organizerStripeAccountId,
    },
    metadata,
  });
}

// ─── Stripe Connect ───────────────────────────────────────────────────────────

export async function createConnectAccountLink(
  organizerId: string,
  email: string,
  returnUrl: string,
  existingAccountId?: string
): Promise<{ accountId: string; onboardingUrl: string }> {
  // Mock mode for local development without real Stripe keys
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    const accountId = existingAccountId || `acct_mock_${organizerId.slice(0, 8)}`;
    return { accountId, onboardingUrl: `${returnUrl}/dashboard/settings?stripe=success` };
  }

  let accountId = existingAccountId;

  if (!accountId) {
    // Create Express account if first time
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata: { organizerId },
      capabilities: {
        transfers: { requested: true },
      },
    });
    accountId = account.id;
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${returnUrl}/dashboard/settings?stripe=refresh`,
    return_url: `${returnUrl}/dashboard/settings?stripe=success`,
    type: 'account_onboarding',
  });

  return { accountId, onboardingUrl: link.url };
}

export async function getConnectAccountBalance(
  stripeAccountId: string
): Promise<{ available: number; pending: number }> {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    return { available: 5000, pending: 15000 };
  }

  const balance = await stripe.balance.retrieve({
    stripeAccount: stripeAccountId,
  });
  const usd = balance.available.find((b) => b.currency === 'usd');
  const pending = balance.pending.find((b) => b.currency === 'usd');
  return {
    available: usd?.amount ?? 0,
    pending: pending?.amount ?? 0,
  };
}

export async function createPayout(
  stripeAccountId: string,
  amount: number
): Promise<Stripe.Payout> {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    return { id: `po_mock_${Date.now()}`, amount, status: 'paid' } as any;
  }

  return stripe.payouts.create(
    { amount, currency: 'usd', method: 'instant' },
    { stripeAccount: stripeAccountId }
  );
}

// ─── Webhook Verification ─────────────────────────────────────────────────────

export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
