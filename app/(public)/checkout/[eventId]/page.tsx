import { notFound, redirect } from 'next/navigation';
import { getEvent } from '@/lib/db';
import { CheckoutClient } from './CheckoutClient';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ reservation?: string; secret?: string; tierId?: string; qty?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getEvent(resolvedParams.eventId);
  return { title: event ? `Checkout — ${event.name}` : 'Checkout' };
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const event = await getEvent(resolvedParams.eventId);
  if (!event || event.status !== 'published') notFound();

  const { reservation, secret, tierId, qty } = resolvedSearchParams;

  // Must have a reservation ID and Stripe client secret to render checkout
  if (!reservation || !secret) {
    redirect(`/events/${event.slug}`);
  }

  const tier = event.tiers.find((t) => t.tierId === tierId) ?? event.tiers[0];
  const quantity = Math.max(1, Math.min(parseInt(qty ?? '1') || 1, tier?.maxPerOrder ?? 4));

  return (
    <CheckoutClient
      event={event}
      tier={tier}
      quantity={quantity}
      reservationId={reservation}
      clientSecret={secret}
      stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}
    />
  );
}
