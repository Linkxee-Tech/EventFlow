import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE_NAME ?? 'EventFlow';

async function createTable() {
  try {
    await client.send(
      new CreateTableCommand({
        TableName: TABLE,
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'SK', KeyType: 'HASH' },
              { AttributeName: 'PK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      })
    );
    console.log(`✓ Table "${TABLE}" created`);
  } catch (e: any) {
    if (e.name === 'ResourceInUseException') {
      console.log(`→ Table "${TABLE}" already exists`);
    } else {
      throw e;
    }
  }
}

async function seed() {
  const organizerId = 'user_seed_001';
  const eventId = 'ev_seed_001';
  const now = new Date().toISOString();

  // Seed organizer
  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `USER#${organizerId}`,
      SK: 'PROFILE',
      userId: organizerId,
      email: 'demo@eventflow.app',
      name: 'EventFlow Demo',
      role: 'organizer',
      createdAt: now,
    },
  }));

  // Seed event
  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `EVENT#${eventId}`,
      SK: 'METADATA',
      id: eventId,
      slug: 'afrobeats-night-out-demo',
      organizerId,
      name: 'Afrobeats Night Out',
      description: "Lagos' biggest monthly celebration of African music. Five rooms, twelve DJs, live performances.",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      venue: 'Eko Hotel & Suites, Victoria Island, Lagos',
      venueLat: 6.4281,
      venueLng: 3.4219,
      status: 'published',
      createdAt: now,
      updatedAt: now,
    },
  }));

  // Seed tiers
  const tiers = [
    { tierId: 'tier_early', name: 'Early Bird', price: 200_00, totalCapacity: 100, availableCount: 12, soldCount: 88, maxPerOrder: 4 },
    { tierId: 'tier_ga', name: 'General Admission', price: 350_00, totalCapacity: 300, availableCount: 211, soldCount: 89, maxPerOrder: 6 },
    { tierId: 'tier_vip', name: 'VIP Table', price: 1500_00, totalCapacity: 10, availableCount: 7, soldCount: 3, maxPerOrder: 2 },
  ];

  for (const tier of tiers) {
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: { PK: `EVENT#${eventId}`, SK: `TIER#${tier.tierId}`, ...tier },
    }));
  }

  console.log('✓ Seed data written');
  console.log(`  Organizer: ${organizerId}`);
  console.log(`  Event: ${eventId} → /events/afrobeats-night-out-demo`);
}

async function main() {
  await createTable();
  // Wait for table to be active
  let active = false;
  while (!active) {
    const { Table } = await client.send(new DescribeTableCommand({ TableName: TABLE }));
    if (Table?.TableStatus === 'ACTIVE') active = true;
    else await new Promise((r) => setTimeout(r, 1000));
  }
  await seed();
}

main().catch(console.error);
