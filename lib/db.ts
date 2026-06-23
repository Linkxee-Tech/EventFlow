import {
  DynamoDBClient,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Event, Ticket, Order, UserProfile, TicketTier } from '@/types';

// ─── Client Setup ─────────────────────────────────────────────────────────────
// Supports local DynamoDB via DYNAMODB_ENDPOINT env var (see docker-compose.yml)

const isLocalDynamo = !!process.env.DYNAMODB_ENDPOINT;

const clientConfig: any = {
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
  },
};
if (isLocalDynamo) clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;

const client = new DynamoDBClient(clientConfig);

export const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE = process.env.DYNAMODB_TABLE_NAME ?? 'EventFlow';

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvent(eventId: string): Promise<Event | null> {
  const { Item } = await db.send(
    new GetCommand({ TableName: TABLE, Key: { PK: `EVENT#${eventId}`, SK: 'METADATA' } })
  );
  if (!Item) return null;

  // Fetch tiers
  const { Items: tierItems = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `EVENT#${eventId}`, ':prefix': 'TIER#' },
    })
  );

  return {
    id: Item.id,
    slug: Item.slug,
    organizerId: Item.organizerId,
    name: Item.name,
    description: Item.description,
    date: Item.date,
    endDate: Item.endDate,
    venue: Item.venue,
    venueLat: Item.venueLat,
    venueLng: Item.venueLng,
    status: Item.status,
    imageUrl: Item.imageUrl,
    aiFlyerPrompt: Item.aiFlyerPrompt,
    createdAt: Item.createdAt,
    updatedAt: Item.updatedAt,
    tiers: tierItems.map(tierFromDynamo),
  };
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  // GSI1: SK = METADATA, filter by slug — or keep a slug→id map item
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'SK = :sk',
      FilterExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':sk': 'METADATA', ':slug': slug },
    })
  );
  if (!Items.length) return null;
  return getEvent(Items[0].id);
}

export async function listEventsByOrganizer(organizerId: string): Promise<Event[]> {
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'SK = :sk',
      FilterExpression: 'organizerId = :oid',
      ExpressionAttributeValues: { ':sk': 'METADATA', ':oid': organizerId },
    })
  );
  const events = await Promise.all(Items.map((i) => getEvent(i.id)));
  return events.filter(Boolean) as Event[];
}

export async function putEvent(event: Omit<Event, 'tiers'>): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${event.id}`,
        SK: 'METADATA',
        ...event,
      },
    })
  );
}

export async function updateEventStatus(
  eventId: string,
  status: Event['status']
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'METADATA' },
      UpdateExpression: 'SET #s = :s, updatedAt = :u',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': status, ':u': new Date().toISOString() },
    })
  );
}

export async function deleteEvent(eventId: string): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'METADATA' },
    })
  );
}

// ─── Ticket Tiers ─────────────────────────────────────────────────────────────

function tierFromDynamo(item: Record<string, unknown>): TicketTier {
  return {
    tierId: item.tierId as string,
    name: item.name as string,
    description: item.description as string | undefined,
    price: item.price as number,
    totalCapacity: item.totalCapacity as number,
    availableCount: item.availableCount as number,
    soldCount: item.soldCount as number,
    maxPerOrder: item.maxPerOrder as number,
  };
}

export async function putTier(eventId: string, tier: TicketTier): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: `TIER#${tier.tierId}`,
        ...tier,
      },
    })
  );
}

export async function getTier(
  eventId: string,
  tierId: string
): Promise<TicketTier | null> {
  const { Item } = await db.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `TIER#${tierId}` },
    })
  );
  return Item ? tierFromDynamo(Item) : null;
}

/**
 * Atomic decrement of availableCount — prevents overselling even under
 * concurrent requests. Throws ConditionalCheckFailedException if sold out.
 */
export async function atomicDecrementAvailability(
  eventId: string,
  tierId: string,
  quantity: number
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `TIER#${tierId}` },
      UpdateExpression:
        'SET availableCount = availableCount - :q, soldCount = soldCount + :q',
      ConditionExpression: 'availableCount >= :q',
      ExpressionAttributeValues: { ':q': quantity },
    })
  );
}

export { ConditionalCheckFailedException };

// ─── Tickets ──────────────────────────────────────────────────────────────────

export async function putTicket(ticket: Ticket): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${ticket.eventId}`,
        SK: `TICKET#${ticket.ticketId}`,
        ...ticket,
      },
    })
  );
}

export async function getTicket(
  eventId: string,
  ticketId: string
): Promise<Ticket | null> {
  const { Item } = await db.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `TICKET#${ticketId}` },
    })
  );
  return Item ? (Item as Ticket) : null;
}

export async function updateTicketStatus(
  eventId: string,
  ticketId: string,
  status: Ticket['status'],
  extra?: Record<string, string>
): Promise<void> {
  const updates = ['#s = :s'];
  const names: Record<string, string> = { '#s': 'status' };
  const values: Record<string, unknown> = { ':s': status };

  if (extra) {
    Object.entries(extra).forEach(([k, v]) => {
      updates.push(`${k} = :${k}`);
      values[`:${k}`] = v;
    });
  }

  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `TICKET#${ticketId}` },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

export async function listTicketsByEvent(eventId: string): Promise<Ticket[]> {
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':prefix': 'TICKET#',
      },
    })
  );
  return Items as Ticket[];
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function putOrder(order: Order): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `ORDER#${order.orderId}`,
        SK: 'METADATA',
        ...order,
      },
    })
  );
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const { Item } = await db.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `ORDER#${orderId}`, SK: 'METADATA' },
    })
  );
  return Item ? (Item as Order) : null;
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  stripeTransferId?: string
): Promise<void> {
  const updates = ['#s = :s'];
  const names: Record<string, string> = { '#s': 'status' };
  const values: Record<string, unknown> = { ':s': status };

  if (stripeTransferId) {
    updates.push('stripeTransferId = :tid');
    values[':tid'] = stripeTransferId;
  }

  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `ORDER#${orderId}`, SK: 'METADATA' },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUser(userId: string): Promise<UserProfile | null> {
  const { Item } = await db.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    })
  );
  return Item ? (Item as UserProfile) : null;
}

export async function putUser(user: UserProfile): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `USER#${user.userId}`,
        SK: 'PROFILE',
        ...user,
      },
    })
  );
}

export async function updateUserStripeAccount(
  userId: string,
  stripeAccountId: string,
  onboardingComplete: boolean
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression:
        'SET stripeAccountId = :sa, stripeOnboardingComplete = :oc',
      ExpressionAttributeValues: {
        ':sa': stripeAccountId,
        ':oc': onboardingComplete,
      },
    })
  );
}

// ─── Transactional Ticket Confirmation ───────────────────────────────────────
// Atomically: mark ticket paid + create order in one DynamoDB transaction

export async function confirmTicketTransaction(
  ticket: Ticket,
  order: Order
): Promise<void> {
  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: {
              PK: `EVENT#${ticket.eventId}`,
              SK: `TICKET#${ticket.ticketId}`,
            },
            UpdateExpression: 'SET #s = :s, paidAt = :pa',
            ConditionExpression: '#s = :reserved',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
              ':s': 'paid',
              ':pa': new Date().toISOString(),
              ':reserved': 'reserved',
            },
          },
        },
        {
          Put: {
            TableName: TABLE,
            Item: {
              PK: `ORDER#${order.orderId}`,
              SK: 'METADATA',
              ...order,
            },
          },
        },
      ],
    })
  );
}

// ─── Public Event Listing ─────────────────────────────────────────────────────

export async function listPublishedEvents(limit = 12): Promise<Event[]> {
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'SK = :sk',
      FilterExpression: '#s = :published',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':sk': 'METADATA', ':published': 'published' },
      Limit: limit,
    })
  );
  const events = await Promise.all(Items.map((i) => getEvent(i.id)));
  return events.filter(Boolean) as Event[];
}

// ─── Reservation TTL Items ────────────────────────────────────────────────────

export interface Reservation {
  reservationId: string;
  eventId: string;
  tierId: string;
  quantity: number;
  ticketIds: string[];
  buyerEmail: string;
  buyerName: string;
  stripePaymentIntentId: string;
  status: 'pending' | 'paid' | 'expired';
  expiresAt: number; // Unix timestamp for DynamoDB TTL
  createdAt: string;
}

export async function putReservation(reservation: Reservation): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `RESERVATION#${reservation.reservationId}`,
        SK: 'METADATA',
        ttl: reservation.expiresAt, // DynamoDB TTL attribute
        ...reservation,
      },
    })
  );
}

export async function getReservation(reservationId: string): Promise<Reservation | null> {
  const { Item } = await db.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `RESERVATION#${reservationId}`, SK: 'METADATA' },
    })
  );
  if (!Item) return null;
  // Check if expired
  if (Item.expiresAt && Item.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return Item as Reservation;
}

export async function updateReservationStatus(
  reservationId: string,
  status: Reservation['status']
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `RESERVATION#${reservationId}`, SK: 'METADATA' },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': status },
    })
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

export async function listRecentOrdersByOrganizer(
  organizerId: string,
  limit = 10
): Promise<Order[]> {
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'SK = :sk',
      FilterExpression: 'organizerId = :oid',
      ExpressionAttributeValues: { ':sk': 'METADATA', ':oid': organizerId },
      Limit: limit,
      ScanIndexForward: false,
    })
  );
  return Items as Order[];
}

// ─── Atomic Increment (rollback) ─────────────────────────────────────────────

export async function atomicIncrementAvailability(
  eventId: string,
  tierId: string,
  quantity: number
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `TIER#${tierId}` },
      UpdateExpression:
        'SET availableCount = availableCount + :q, soldCount = soldCount - :q',
      ExpressionAttributeValues: { ':q': quantity },
    })
  );
}
