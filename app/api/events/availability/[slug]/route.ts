import { NextRequest } from 'next/server';
import { getEventBySlug } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/utils';
import { logError } from '@/lib/logger';

type Params = { params: { slug: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const event = await getEventBySlug(params.slug);
    if (!event || event.status !== 'published') return apiError('Event not found', 404);
    const availability: Record<string, { available: number; total: number; soldOut: boolean }> = {};
    for (const tier of event.tiers) {
      availability[tier.tierId] = {
        available: tier.availableCount,
        total: tier.totalCapacity,
        soldOut: tier.availableCount === 0,
      };
    }
    return apiSuccess(availability);
  } catch (err) {
    logError('GET /api/events/availability/[slug]', err);
    return apiError('Failed to load availability', 500);
  }
}
