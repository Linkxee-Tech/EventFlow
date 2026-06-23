import { NextRequest } from 'next/server';
import { getUser, putUser } from '@/lib/db';
import { apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { sanitizeText } from '@/lib/sanitize';
import { z } from 'zod';

// GET /api/user/me
export async function GET() {
  const auth = await requireAuth();
  if (!auth) return apiError('Unauthorized', 401);

  const profile = await getUser(auth.userId);
  if (!profile) return apiError('User profile not found', 404);

  // Never expose sensitive internal fields
  const { stripeAccountId: _, ...safe } = profile as any;
  return apiSuccess({ ...safe, stripeAccountId: profile.stripeAccountId ? '***connected***' : null });
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// PATCH /api/user/me — update display name
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return apiError('Unauthorized', 401);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const profile = await getUser(auth.userId);
  if (!profile) return apiError('User not found', 404);

  if (parsed.data.name) {
    profile.name = sanitizeText(parsed.data.name);
  }

  await putUser(profile);
  return apiSuccess({ name: profile.name });
}
