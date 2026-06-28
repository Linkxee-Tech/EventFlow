import { NextRequest } from 'next/server';
import { getEvent, updateEventStatus, getUser } from '@/lib/db';
import { apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { logError } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const event = await getEvent(resolvedParams.id);
    if (!event) return apiError('Event not found', 404);
    if (event.organizerId !== auth.userId) return apiError('Forbidden', 403);
    const profile = await getUser(auth.userId);
    if (!profile?.stripeAccountId || !profile.stripeOnboardingComplete) {
      return apiError(
        'Connect a Stripe account before publishing. Go to Settings → Payouts.',
        402
      );
    }
    if (event.tiers.length === 0) {
      return apiError('Add at least one ticket tier before publishing.', 422);
    }
    await updateEventStatus(resolvedParams.id, 'published');
    return apiSuccess({ published: true, slug: event.slug });
  } catch (err) {
    logError('POST /api/events/[id]/publish', err);
    return apiError('Failed to publish event', 500);
  }
}
