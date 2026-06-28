import { NextRequest } from 'next/server';
import { getEvent, putEvent, deleteEvent, updateEventStatus } from '@/lib/db';
import { apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { sanitizeEventInput } from '@/lib/sanitize';
import { logError } from '@/lib/logger';
import { z } from 'zod';

const updateEventSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  endDate: z.string().optional(),
  venue: z.string().optional(),
  venueLat: z.number().optional(),
  venueLng: z.number().optional(),
  imageUrl: z.string().optional(),
  aiFlyerPrompt: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const event = await getEvent(resolvedParams.id);
    if (!event) return apiError('Event not found', 404);
    if (event.organizerId !== auth.userId) return apiError('Forbidden', 403);
    return apiSuccess(event);
  } catch (err) {
    logError('GET /api/events/[id]', err);
    return apiError('Failed to load event', 500);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const event = await getEvent(resolvedParams.id);
    if (!event) return apiError('Event not found', 404);
    if (event.organizerId !== auth.userId) return apiError('Forbidden', 403);
    const body = await req.json().catch(() => ({}));
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 400);
    }
    const validData = parsed.data;

    const allowed = ['name', 'description', 'date', 'endDate', 'venue', 'venueLat', 'venueLng', 'imageUrl', 'aiFlyerPrompt'];
    const updates: Partial<typeof event> = {};
    allowed.forEach((k) => { if (k in validData) (updates as Record<string, unknown>)[k] = validData[k as keyof typeof validData]; });
    // Sanitize mutable text fields
    if (updates.name) updates.name = sanitizeEventInput({ name: updates.name as string, description: '', venue: '' }).name;
    if (updates.description) updates.description = sanitizeEventInput({ name: '', description: updates.description as string, venue: '' }).description;
    const { tiers, ...eventBase } = { ...event, ...updates, updatedAt: new Date().toISOString() };
    await putEvent(eventBase);
    return apiSuccess({ ...eventBase, tiers });
  } catch (err) {
    logError('PUT /api/events/[id]', err);
    return apiError('Failed to update event', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const event = await getEvent(resolvedParams.id);
    if (!event) return apiError('Event not found', 404);
    if (event.organizerId !== auth.userId) return apiError('Forbidden', 403);
    if (event.status === 'published') return apiError('Cannot delete a published event. Cancel it first.', 409);
    await deleteEvent(resolvedParams.id);
    return apiSuccess({ deleted: true });
  } catch (err) {
    logError('DELETE /api/events/[id]', err);
    return apiError('Failed to delete event', 500);
  }
}
