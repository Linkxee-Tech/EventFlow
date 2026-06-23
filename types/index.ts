// ─── Core Entities ───────────────────────────────────────────────────────────

export type EventStatus = 'draft' | 'published' | 'ended' | 'cancelled';
export type TicketStatus = 'reserved' | 'paid' | 'used' | 'refunded';
export type OrderStatus = 'pending' | 'completed' | 'refunded';

export interface TicketTier {
  tierId: string;
  name: string;
  description?: string;
  price: number; // cents
  totalCapacity: number;
  availableCount: number;
  soldCount: number;
  maxPerOrder: number;
}

export interface Event {
  id: string;
  slug: string;
  organizerId: string;
  name: string;
  description: string;
  date: string; // ISO 8601
  endDate?: string;
  venue: string;
  venueLat?: number;
  venueLng?: number;
  status: EventStatus;
  imageUrl?: string;
  aiFlyerPrompt?: string;
  tiers: TicketTier[];
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  ticketId: string;
  eventId: string;
  tierId: string;
  orderId: string;
  buyerEmail: string;
  buyerName: string;
  qrHash: string;
  status: TicketStatus;
  reservedAt: string;
  paidAt?: string;
  checkedInAt?: string;
  pricePaid: number; // cents
  fee: number; // cents
}

export interface Order {
  orderId: string;
  eventId: string;
  organizerId: string;
  buyerEmail: string;
  buyerName: string;
  totalAmount: number; // cents
  platformFee: number; // cents
  netToOrganizer: number; // cents
  stripePaymentIntentId: string;
  stripeTransferId?: string;
  status: OrderStatus;
  tickets: string[]; // ticketIds
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  role: 'organizer' | 'attendee';
  createdAt: string;
}

// ─── API Request / Response Types ────────────────────────────────────────────

export interface CreateEventInput {
  name: string;
  description: string;
  date: string;
  endDate?: string;
  venue: string;
  venueLat?: number;
  venueLng?: number;
  imageUrl?: string;
  tiers: Omit<TicketTier, 'tierId' | 'availableCount' | 'soldCount'>[];
}

export interface ReserveTicketsInput {
  eventId: string;
  tierId: string;
  quantity: number;
  buyerEmail: string;
  buyerName: string;
}

export interface ReserveTicketsResponse {
  reservationId: string;
  expiresAt: string;
  paymentIntentClientSecret: string;
  amount: number;
  platformFee: number;
}

export interface ConfirmTicketsInput {
  reservationId: string;
  paymentIntentId: string;
  buyerEmail: string;
  buyerName: string;
}

export interface ScanTicketInput {
  ticketId: string;
  eventId: string;
  qrHash: string;
}

export interface ScanTicketResponse {
  valid: boolean;
  ticket?: Ticket;
  attendeeName?: string;
  tierName?: string;
  message: string;
}

export interface GenerateFlyerInput {
  eventName: string;
  eventDate: string;
  venue: string;
  theme: string;
  style: string;
}

export interface GenerateFlyerResponse {
  copy: string;
  tagline: string;
  imagePrompt: string;
  caption: string;
}

// ─── Fee Calculation ──────────────────────────────────────────────────────────

export interface FeeBreakdown {
  subtotal: number;    // cents — ticket price × qty
  platformFee: number; // cents — 2.5% + 30¢
  total: number;       // cents
}

export function calculateFee(pricePerTicket: number, quantity: number): FeeBreakdown {
  const subtotal = pricePerTicket * quantity;
  const platformFee = Math.round(subtotal * 0.025) + 30;
  return { subtotal, platformFee, total: subtotal + platformFee };
}
