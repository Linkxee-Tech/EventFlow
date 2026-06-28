import { NextRequest } from 'next/server';
import { getEvent, putEvent, deleteEvent, updateEventStatus } from '@/lib/db';
import { apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { sanitizeEventInput } from '@/lib/sanitize';
import { logError } from '@/lib/logger';
import { z } from 'zod';
import { generateId } from '@/lib/utils';

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
  tiers: z.array(z.object({
    tierId: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    price: z.number().min(0),
    totalCapacity: z.number().min(1),
    maxPerOrder: z.number().min(1).max(20).optional().default(4),
  })).optional(),
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
    
    const { tiers: _ignored, ...eventBase } = { ...event, ...updates, updatedAt: new Date().toISOString() };
    await putEvent(eventBase);

    // Process tiers if provided
    let finalTiers = event.tiers;
    if (validData.tiers) {
      const incomingTiers = validData.tiers;
      const incomingIds = incomingTiers.map(t => t.tierId).filter(Boolean);
      
      // 1. Delete removed tiers (only if soldCount === 0)
      for (const t of event.tiers) {
        if (!incomingIds.includes(t.tierId)) {
          if (t.soldCount > 0) {
            return apiError(`Cannot delete tier '${t.name}' because tickets have already been sold.`, 400);
          }
          // Dynamic import to avoid circular dep if any, or just use deleteTier directly if we export it
          const { deleteTier } = await import('@/lib/db');
          await deleteTier(event.id, t.tierId);
        }
      }

      // 2. Add or Update tiers
      const { putTier } = await import('@/lib/db');
      finalTiers = [];
      for (const t of incomingTiers) {
        if (t.tierId) {
          // Update existing
          const existing = event.tiers.find(et => et.tierId === t.tierId);
          if (!existing) return apiError(`Tier ${t.tierId} not found`, 404);
          
          // Adjust availableCount if totalCapacity changed
          const capacityDiff = t.totalCapacity - existing.totalCapacity;
          const newAvailableCount = existing.availableCount + capacityDiff;
          if (newAvailableCount < 0) {
            return apiError(`Cannot reduce capacity of '${t.name}' below tickets already sold`, 400);
          }
          
          const updatedTier = {
            ...existing,
            name: t.name,
            description: t.description,
            price: t.price,
            totalCapacity: t.totalCapacity,
            availableCount: newAvailableCount,
            maxPerOrder: t.maxPerOrder,
          };
          await putTier(event.id, updatedTier);
          finalTiers.push(updatedTier);
        } else {
          // Create new
          const newTier = {
            tierId: generateId(8),
            name: t.name,
            description: t.description,
            price: t.price,
            totalCapacity: t.totalCapacity,
            availableCount: t.totalCapacity,
            soldCount: 0,
            maxPerOrder: t.maxPerOrder,
          };
          await putTier(event.id, newTier);
          finalTiers.push(newTier);
        }
      }
    }

    return apiSuccess({ ...eventBase, tiers: finalTiers });
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
