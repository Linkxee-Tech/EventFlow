import { NextRequest } from 'next/server';
import { getEvent, putEvent, deleteEvent, updateEventStatus } from '@/lib/db';
import { apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { sanitizeEventInput } from '@/lib/sanitize';
import { logError } from '@/lib/logger';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const event = await getEvent(params.id);
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
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const event = await getEvent(params.id);
    if (!event) return apiError('Event not found', 404);
    if (event.organizerId !== auth.userId) return apiError('Forbidden', 403);
    const body = await req.json().catch(() => ({}));
    const allowed = ['name', 'description', 'date', 'endDate', 'venue', 'venueLat', 'venueLng', 'imageUrl', 'aiFlyerPrompt'];
    const updates: Partial<typeof event> = {};
    allowed.forEach((k) => { if (k in body) (updates as Record<string, unknown>)[k] = body[k]; });
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
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const event = await getEvent(params.id);
    if (!event) return apiError('Event not found', 404);
    if (event.organizerId !== auth.userId) return apiError('Forbidden', 403);
    if (event.status === 'published') return apiError('Cannot delete a published event. Cancel it first.', 409);
    await deleteEvent(params.id);
    return apiSuccess({ deleted: true });
  } catch (err) {
    logError('DELETE /api/events/[id]', err);
    return apiError('Failed to delete event', 500);
  }
}
