import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/db';
import { formatEventDate } from '@/lib/utils';
import { EventPageClient } from './EventPageClient';
import type { Metadata } from 'next';

type Props = { params: { slug: string } };

// Phase 2: ISR — revalidate every 60 seconds
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug(params.slug);
  if (!event) return { title: 'Event not found' };
  return {
    title: event.name,
    description: event.description.slice(0, 160),
    openGraph: {
      title: event.name,
      description: event.description.slice(0, 160),
      images: event.imageUrl ? [{ url: event.imageUrl, width: 1200, height: 630 }] : [],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title: event.name },
  };
}

export default async function EventPage({ params }: Props) {
  const event = await getEventBySlug(params.slug);
  if (!event || event.status !== 'published') notFound();

  return <EventPageClient event={event} />;
}
