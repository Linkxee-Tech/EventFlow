import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

/**
 * Unit Tests: Atomic DynamoDB Operations
 * 
 * Tests verify that the EventFlow ticketing system prevents overselling
 * through atomic DynamoDB conditional writes.
 * 
 * These tests assume a local DynamoDB instance running on localhost:8000
 * Start with: docker-compose up -d
 */

let db: DynamoDBDocumentClient;
const TABLE = 'EventFlow';

beforeAll(async () => {
  const client = new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    },
  });
  db = DynamoDBDocumentClient.from(client);
});

describe('Atomic Inventory Operations', () => {
  
  it('should decrement availability with conditional check', async () => {
    // Setup: Create tier with 10 available tickets
    const eventId = 'test-event-001';
    const tierId = 'tier-early';
    const initialCapacity = 10;
    
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: `TIER#${tierId}`,
        tierId,
        name: 'Early Bird',
        price: 1000,
        totalCapacity: initialCapacity,
        availableCount: initialCapacity,
        soldCount: 0,
        maxPerOrder: 4,
      },
    }));

    // Test: Atomically decrement by 2 (reserve operation)
    const quantity = 2;
    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `TIER#${tierId}` },
      UpdateExpression: 'SET availableCount = availableCount - :qty, reservedCount = if_not_exists(reservedCount, :zero) + :qty',
      ConditionExpression: 'availableCount >= :qty',
      ExpressionAttributeValues: { ':qty': quantity, ':zero': 0 },
      ReturnValues: 'ALL_NEW',
    }));

    expect(Attributes?.availableCount).toBe(initialCapacity - quantity);
    expect(Attributes?.reservedCount).toBe(quantity);
  });

  it('should reject decrement when insufficient availability', async () => {
    const eventId = 'test-event-002';
    const tierId = 'tier-standard';
    
    // Setup: Only 2 tickets available
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: `TIER#${tierId}`,
        tierId,
        name: 'Standard',
        price: 1500,
        totalCapacity: 2,
        availableCount: 2,
        soldCount: 0,
        maxPerOrder: 4,
      },
    }));

    // Try to reserve 3 tickets (should fail)
    const quantity = 3;
    try {
      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `EVENT#${eventId}`, SK: `TIER#${tierId}` },
        UpdateExpression: 'SET availableCount = availableCount - :qty',
        ConditionExpression: 'availableCount >= :qty',
        ExpressionAttributeValues: { ':qty': quantity },
        ReturnValues: 'ALL_NEW',
      }));
      throw new Error('Should have failed with conditional check');
    } catch (error: any) {
      expect(error.name).toContain('ValidationException');
    }
  });

  it('should rollback on payment failure', async () => {
    const eventId = 'test-event-003';
    const tierId = 'tier-vip';
    const initialCapacity = 5;

    // Setup
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: `TIER#${tierId}`,
        tierId,
        availableCount: initialCapacity,
        reservedCount: 0,
      },
    }));

    // Reserve 3 tickets
    const quantity = 3;
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `TIER#${tierId}` },
      UpdateExpression: 'SET availableCount = availableCount - :qty, reservedCount = reservedCount + :qty',
      ExpressionAttributeValues: { ':qty': quantity },
    }));

    // Simulate payment failure - rollback inventory
    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `TIER#${tierId}` },
      UpdateExpression: 'SET availableCount = availableCount + :qty, reservedCount = reservedCount - :qty',
      ExpressionAttributeValues: { ':qty': quantity },
      ReturnValues: 'ALL_NEW',
    }));

    expect(Attributes?.availableCount).toBe(initialCapacity);
    expect(Attributes?.reservedCount).toBe(0);
  });

  it('should handle concurrent reserve requests', async () => {
    const eventId = 'test-event-concurrent';
    const tierId = 'tier-general';
    const initialCapacity = 10;

    // Setup
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: `TIER#${tierId}`,
        tierId,
        availableCount: initialCapacity,
        reservedCount: 0,
      },
    }));

    // Simulate 5 concurrent requests each reserving 2 tickets
    const promises = Array(5)
      .fill(0)
      .map(() =>
        db.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `EVENT#${eventId}`, SK: `TIER#${tierId}` },
          UpdateExpression: 'SET availableCount = availableCount - :qty, reservedCount = reservedCount + :qty',
          ConditionExpression: 'availableCount >= :qty',
          ExpressionAttributeValues: { ':qty': 2 },
          ReturnValues: 'ALL_NEW',
        }))
      );

    const results = await Promise.all(promises);
    const finalAvailable = results[results.length - 1].Attributes?.availableCount ?? 0;

    // Should have exactly 10 - (5 * 2) = 0 tickets left
    expect(finalAvailable).toBe(0);
  });

  it('should mark ticket as paid (idempotent)', async () => {
    const ticketId = 'ticket-test-001';
    const eventId = 'test-event-004';
    const orderId = 'order-test-001';

    // Setup: Create ticket as reserved
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: `TICKET#${ticketId}`,
        ticketId,
        eventId,
        orderId,
        status: 'reserved',
        paidAt: null,
      },
    }));

    // First payment confirmation
    const { Attributes: first } = await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `TICKET#${ticketId}` },
      UpdateExpression: 'SET #status = :paid, paidAt = :now',
      ConditionExpression: '#status = :reserved',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':reserved': 'reserved',
        ':paid': 'paid',
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }));

    expect(first?.status).toBe('paid');

    // Second payment attempt (idempotent - should fail gracefully)
    try {
      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `EVENT#${eventId}`, SK: `TICKET#${ticketId}` },
        UpdateExpression: 'SET #status = :paid',
        ConditionExpression: '#status = :reserved',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':reserved': 'reserved',
          ':paid': 'paid',
        },
        ReturnValues: 'ALL_NEW',
      }));
      throw new Error('Should have rejected second payment');
    } catch (error: any) {
      expect(error.name).toContain('ValidationException');
    }
  });
});

describe('User Profile Management', () => {
  
  it('should create user profile on first signup', async () => {
    const userId = 'user-test-001';
    const { Attributes } = await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        userId,
        email: 'test@example.com',
        name: 'Test Organizer',
        role: 'organizer',
        stripeAccountId: null,
        createdAt: new Date().toISOString(),
      },
      ReturnValues: 'ALL_OLD',
    }));

    const retrieved = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    }));

    expect(retrieved.Item?.email).toBe('test@example.com');
    expect(retrieved.Item?.role).toBe('organizer');
  });

  it('should update Stripe account on Connect onboarding', async () => {
    const userId = 'user-test-002';

    // Create initial profile
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        userId,
        email: 'organizer@example.com',
        role: 'organizer',
        stripeAccountId: null,
        stripeOnboardingComplete: false,
      },
    }));

    // Update with Stripe account
    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET stripeAccountId = :acctId, stripeOnboardingComplete = :true',
      ExpressionAttributeValues: {
        ':acctId': 'acct_test_123',
        ':true': true,
      },
      ReturnValues: 'ALL_NEW',
    }));

    expect(Attributes?.stripeAccountId).toBe('acct_test_123');
    expect(Attributes?.stripeOnboardingComplete).toBe(true);
  });
});
