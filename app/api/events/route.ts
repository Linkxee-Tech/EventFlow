import { NextRequest } from 'next/server';
import { listEventsByOrganizer, putEvent, putTier } from '@/lib/db';
import { generateId, slugify, apiSuccess, apiError, requireAuth } from '@/lib/utils';
import { sanitizeEventInput } from '@/lib/sanitize';
import { logRequest, logError } from '@/lib/logger';
import type { CreateEventInput, Event } from '@/types';
import { z } from 'zod';

const createEventSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().min(10).max(5000),
  date: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  venue: z.string().min(3).max(200),
  venueLat: z.number().optional(),
  venueLng: z.number().optional(),
  imageUrl: z.string().url().optional(),
  aiFlyerPrompt: z.string().max(200).optional(),
  tiers: z.array(z.object({
    name: z.string().min(1).max(80),
    description: z.string().max(200).optional(),
    price: z.number().int().min(0),
    totalCapacity: z.number().int().min(1).max(100_000),
    maxPerOrder: z.number().int().min(1).max(20),
  })).min(1).max(10),
});

// GET /api/events — list all events for authenticated organizer
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);
    const events = await listEventsByOrganizer(auth.userId);
    return apiSuccess(events);
  } catch (err) {
    logError('GET /api/events', err);
    return apiError('Failed to load events', 500);
  }
}

// POST /api/events — create new event
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) return apiError('Unauthorized', 401);

    const body = await req.json().catch(() => null);
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues.map((i) => i.message).join(', '), 422);
    }

    const sanitized = sanitizeEventInput({
      name: parsed.data.name,
      description: parsed.data.description,
      venue: parsed.data.venue,
    });
    const input: CreateEventInput = { ...parsed.data, ...sanitized } as CreateEventInput;
    logRequest('POST', '/api/events', { organizerId: auth.userId, eventName: sanitized.name });

    const eventId = generateId('ev');
    const now = new Date().toISOString();

    const eventBase: Omit<Event, 'tiers'> = {
      id: eventId,
      slug: slugify(input.name),
      organizerId: auth.userId,
      name: input.name,
      description: input.description,
      date: input.date,
      endDate: input.endDate,
      venue: input.venue,
      venueLat: input.venueLat,
      venueLng: input.venueLng,
      status: 'draft',
      imageUrl: input.imageUrl,
      createdAt: now,
      updatedAt: now,
    };

    await putEvent(eventBase);

    await Promise.all(
      input.tiers.map((t) =>
        putTier(eventId, {
          tierId: generateId('tier'),
          name: t.name,
          description: t.description,
          price: t.price,
          totalCapacity: t.totalCapacity,
          availableCount: t.totalCapacity,
          soldCount: 0,
          maxPerOrder: t.maxPerOrder,
        })
      )
    );

    return apiSuccess({ id: eventId, slug: eventBase.slug }, 201);
  } catch (err) {
    logError('POST /api/events', err);
    return apiError('Failed to create event', 500);
  }
}
