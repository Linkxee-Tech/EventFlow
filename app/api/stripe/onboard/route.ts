import { NextRequest } from 'next/server';
import { createConnectAccountLink } from '@/lib/stripe';
import { getUser, updateUserStripeAccount } from '@/lib/db';
import { apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { ENV } from '@/lib/env';

// GET /api/stripe/onboard — generate Stripe Connect OAuth link
export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return apiError('Unauthorized', 401);

  const profile = await getUser(auth.userId);
  if (!profile) return apiError('User profile not found', 404);

  try {
    const { accountId, onboardingUrl } = await createConnectAccountLink(
      auth.userId,
      auth.email,
      ENV.APP_URL,
      profile.stripeAccountId
    );

    // Store accountId immediately (onboarding may not complete right away)
    if (!profile.stripeAccountId) {
      await updateUserStripeAccount(auth.userId, accountId, false);
    }

    return apiSuccess({ onboardingUrl, accountId });
  } catch (err: any) {
    console.error('[stripe/onboard]', err);
    return apiError('Failed to create Stripe onboarding link. Try again.', 500);
  }
}
