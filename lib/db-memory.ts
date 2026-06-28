/**
 * In-memory fallback store — used when DynamoDB is unreachable (e.g. Docker not running).
 * Data lives in a global singleton so it survives Next.js hot-reloads.
 * ⚠️  For local development only — data resets on server restart.
 */

import type { UserProfile, Event, Ticket, Order, TicketTier } from '@/types';
import type { Reservation } from '@/lib/db';

interface MemStore {
  users: Map<string, UserProfile & { passwordHash?: string }>;
  usersByEmail: Map<string, string>; // email → userId
  events: Map<string, Omit<Event, 'tiers'>>;
  tiers: Map<string, TicketTier & { eventId: string }>;
  tickets: Map<string, Ticket>;
  orders: Map<string, Order>;
  reservations: Map<string, Reservation>;
}

declare global {
  // eslint-disable-next-line no-var
  var __eventflow_mem_store: MemStore | undefined;
}

function getStore(): MemStore {
  if (!global.__eventflow_mem_store) {
    global.__eventflow_mem_store = {
      users: new Map(),
      usersByEmail: new Map(),
      events: new Map(),
      tiers: new Map(),
      tickets: new Map(),
      orders: new Map(),
      reservations: new Map(),
    };
  }
  return global.__eventflow_mem_store;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function memGetUser(userId: string): (UserProfile & { passwordHash?: string }) | null {
  return getStore().users.get(userId) ?? null;
}

export function memPutUser(user: UserProfile & { passwordHash?: string }): void {
  const store = getStore();
  store.users.set(user.userId, user);
  store.usersByEmail.set(user.email.toLowerCase(), user.userId);
}

export function memGetUserByEmail(email: string): (UserProfile & { passwordHash?: string }) | null {
  const store = getStore();
  const userId = store.usersByEmail.get(email.toLowerCase());
  if (!userId) return null;
  return store.users.get(userId) ?? null;
}

export function memUpdateUserStripeAccount(
  userId: string,
  stripeAccountId: string,
  onboardingComplete: boolean
): void {
  const store = getStore();
  const user = store.users.get(userId);
  if (user) {
    store.users.set(userId, { ...user, stripeAccountId, stripeOnboardingComplete: onboardingComplete });
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function memGetEvent(eventId: string): Event | null {
  const store = getStore();
  const event = store.events.get(eventId);
  if (!event) return null;
  const tiers = Array.from(store.tiers.values())
    .filter(t => t.eventId === eventId)
    .map(({ eventId: _eid, ...t }) => t as TicketTier);
  return { ...event, tiers };
}

export function memPutEvent(event: Omit<Event, 'tiers'>): void {
  getStore().events.set(event.id, event);
}

export function memListEventsByOrganizer(organizerId: string): Event[] {
  const store = getStore();
  return Array.from(store.events.values())
    .filter(e => e.organizerId === organizerId)
    .map(e => memGetEvent(e.id)!);
}

export function memListPublishedEvents(limit = 12): Event[] {
  const store = getStore();
  return Array.from(store.events.values())
    .filter(e => e.status === 'published')
    .slice(0, limit)
    .map(e => memGetEvent(e.id)!);
}

export function memUpdateEventStatus(eventId: string, status: Event['status']): void {
  const store = getStore();
  const event = store.events.get(eventId);
  if (event) store.events.set(eventId, { ...event, status, updatedAt: new Date().toISOString() });
}

export function memDeleteEvent(eventId: string): void {
  getStore().events.delete(eventId);
}

// ─── Tiers ────────────────────────────────────────────────────────────────────

export function memPutTier(eventId: string, tier: TicketTier): void {
  getStore().tiers.set(`${eventId}#${tier.tierId}`, { ...tier, eventId });
}

export function memDeleteTier(eventId: string, tierId: string): void {
  getStore().tiers.delete(`${eventId}#${tierId}`);
}

export function memGetTier(eventId: string, tierId: string): TicketTier | null {
  const t = getStore().tiers.get(`${eventId}#${tierId}`);
  if (!t) return null;
  const { eventId: _eid, ...tier } = t;
  return tier as TicketTier;
}

export function memAtomicDecrementAvailability(eventId: string, tierId: string, quantity: number): void {
  const key = `${eventId}#${tierId}`;
  const store = getStore();
  const tier = store.tiers.get(key);
  if (!tier) throw new Error('Tier not found');
  if (tier.availableCount < quantity) throw new Error('Sold out');
  store.tiers.set(key, {
    ...tier,
    availableCount: tier.availableCount - quantity,
    soldCount: tier.soldCount + quantity,
  });
}

export function memAtomicIncrementAvailability(eventId: string, tierId: string, quantity: number): void {
  const key = `${eventId}#${tierId}`;
  const store = getStore();
  const tier = store.tiers.get(key);
  if (!tier) return;
  store.tiers.set(key, {
    ...tier,
    availableCount: tier.availableCount + quantity,
    soldCount: Math.max(0, tier.soldCount - quantity),
  });
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export function memPutTicket(ticket: Ticket): void {
  getStore().tickets.set(ticket.ticketId, ticket);
}

export function memGetTicket(_eventId: string, ticketId: string): Ticket | null {
  return getStore().tickets.get(ticketId) ?? null;
}

export function memListTicketsByEvent(eventId: string): Ticket[] {
  return Array.from(getStore().tickets.values()).filter(t => t.eventId === eventId);
}

export function memUpdateTicketStatus(
  _eventId: string,
  ticketId: string,
  status: Ticket['status'],
  extra?: Record<string, string>
): void {
  const store = getStore();
  const ticket = store.tickets.get(ticketId);
  if (ticket) store.tickets.set(ticketId, { ...ticket, status, ...extra });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function memPutOrder(order: Order): void {
  getStore().orders.set(order.orderId, order);
}

export function memGetOrder(orderId: string): Order | null {
  return getStore().orders.get(orderId) ?? null;
}

export function memUpdateOrderStatus(orderId: string, status: Order['status'], stripeTransferId?: string): void {
  const store = getStore();
  const order = store.orders.get(orderId);
  if (order) store.orders.set(orderId, { ...order, status, ...(stripeTransferId ? { stripeTransferId } : {}) });
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export function memPutReservation(reservation: Reservation): void {
  getStore().reservations.set(reservation.reservationId, reservation);
}

export function memGetReservation(reservationId: string): Reservation | null {
  const r = getStore().reservations.get(reservationId);
  if (!r) return null;
  if (r.expiresAt && r.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return r;
}

export function memUpdateReservationStatus(reservationId: string, status: Reservation['status']): void {
  const store = getStore();
  const r = store.reservations.get(reservationId);
  if (r) store.reservations.set(reservationId, { ...r, status });
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export function memListRecentOrdersByOrganizer(organizerId: string, limit = 10): Order[] {
  return Array.from(getStore().orders.values())
    .filter(o => o.organizerId === organizerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function memListOrdersByBuyerEmail(buyerEmail: string): Order[] {
  return Array.from(getStore().orders.values())
    .filter((o) => o.buyerEmail === buyerEmail)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function memConfirmTicketTransaction(ticket: Ticket, order: Order): void {
  const store = getStore();
  const existing = store.tickets.get(ticket.ticketId);
  if (!existing || existing.status !== 'reserved') throw new Error('Ticket not in reserved state');
  store.tickets.set(ticket.ticketId, { ...existing, status: 'paid', paidAt: new Date().toISOString() });
  store.orders.set(order.orderId, order);
}
