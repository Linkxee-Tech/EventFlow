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
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Event, Ticket, Order, UserProfile, TicketTier } from '@/types';
import * as mem from '@/lib/db-memory';

// ─── Client Setup ─────────────────────────────────────────────────────────────
// Supports local DynamoDB via DYNAMODB_ENDPOINT env var (see docker-compose.yml)

const isLocalDynamo = !!process.env.DYNAMODB_ENDPOINT;

const clientConfig: any = {
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
  },
  // Fail fast so the in-memory fallback kicks in quickly when Docker isn't running
  maxAttempts: 1,
};
if (isLocalDynamo) clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;

const client = new DynamoDBClient(clientConfig);

export const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE = process.env.DYNAMODB_TABLE_NAME ?? 'EventFlow';

/**
 * Returns true for network-level errors (Docker not running, DynamoDB unreachable).
 * In these cases we fall back to the in-memory store automatically.
 */
function isConnectionError(err: unknown): boolean {
  const code = (err as any)?.code ?? (err as any)?.$metadata?.httpStatusCode;
  const name = (err as any)?.name;
  const detail = (err as any)?.detail;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    name === 'TimeoutError' ||
    name === 'UnknownError' ||
    name === 'UnrecognizedClientException' ||
    name === 'CredentialsProviderError' ||
    name === 'ResourceNotFoundException' ||
    detail === 'Not Found' ||
    (err as any)?.message?.includes('ECONNREFUSED')
  );
}


// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvent(eventId: string): Promise<Event | null> {
  try {
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
  } catch (err) {
    if (isConnectionError(err)) return mem.memGetEvent(eventId);
    throw err;
  }
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
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
  } catch (err) {
    // memGetEvent doesn't support by slug natively but we can mock it or just return null
    if (isConnectionError(err)) {
      const allEvents = mem.memListPublishedEvents(100);
      return allEvents.find(e => e.slug === slug) ?? null;
    }
    throw err;
  }
}

export async function listEventsByOrganizer(organizerId: string): Promise<Event[]> {
  try {
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
  } catch (err) {
    if (isConnectionError(err)) return mem.memListEventsByOrganizer(organizerId);
    throw err;
  }
}

export async function putEvent(event: Omit<Event, 'tiers'>): Promise<void> {
  try {
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
  } catch (err) {
    if (isConnectionError(err)) { mem.memPutEvent(event); return; }
    throw err;
  }
}

export async function updateEventStatus(
  eventId: string,
  status: Event['status']
): Promise<void> {
  try {
    await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `EVENT#${eventId}`, SK: 'METADATA' },
        UpdateExpression: 'SET #s = :s, updatedAt = :u',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': status, ':u': new Date().toISOString() },
      })
    );
  } catch (err) {
    if (isConnectionError(err)) { mem.memUpdateEventStatus(eventId, status); return; }
    throw err;
  }
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
  try {
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
  } catch (err) {
    if (isConnectionError(err)) { mem.memPutTier(eventId, tier); return; }
    throw err;
  }
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
  try {
    const { Item } = await db.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      })
    );
    return Item ? (Item as UserProfile) : null;
  } catch (err) {
    if (isConnectionError(err)) return mem.memGetUser(userId);
    throw err;
  }
}

export async function putUser(user: UserProfile & { passwordHash?: string }): Promise<void> {
  try {
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
  } catch (err) {
    if (isConnectionError(err)) { mem.memPutUser(user); return; }
    throw err;
  }
}

export async function getUserByEmail(
  email: string
): Promise<(UserProfile & { passwordHash?: string }) | null> {
  try {
    // Query GSI1 where SK = 'PROFILE' and filter by email
    const { Items = [] } = await db.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'SK = :sk',
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: { ':sk': 'PROFILE', ':email': email },
        Limit: 1,
      })
    );
    if (!Items.length) return null;
    return Items[0] as UserProfile & { passwordHash?: string };
  } catch (err) {
    if (isConnectionError(err)) return mem.memGetUserByEmail(email);
    throw err;
  }
}


export async function updateUserStripeAccount(
  userId: string,
  stripeAccountId: string,
  onboardingComplete: boolean
): Promise<void> {
  try {
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
  } catch (err) {
    if (isConnectionError(err)) {
      mem.memUpdateUserStripeAccount(userId, stripeAccountId, onboardingComplete);
      return;
    }
    throw err;
  }
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
  try {
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
  } catch (err) {
    if (isConnectionError(err)) return mem.memListPublishedEvents(limit);
    throw err;
  }
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
  try {
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
  } catch (err) {
    if (isConnectionError(err)) return mem.memListRecentOrdersByOrganizer(organizerId, limit);
    throw err;
  }
}

export async function listOrdersByBuyerEmail(buyerEmail: string): Promise<Order[]> {
  try {
    // TODO: Switch to GSI2 (where buyerEmail is PK) once created by the user.
    // For now, using a Scan as requested for the hackathon MVP.
    const { Items = [] } = await db.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND buyerEmail = :email',
        ExpressionAttributeValues: {
          ':prefix': 'ORDER#',
          ':sk': 'METADATA',
          ':email': buyerEmail,
        },
      })
    );
    return (Items as Order[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    if (isConnectionError(err)) return mem.memListOrdersByBuyerEmail(buyerEmail);
    throw err;
  }
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
