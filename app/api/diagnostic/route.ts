import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: any = {
    env: {
      hasAwsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasAwsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION || 'us-east-1 (default)',
      dynamoTable: process.env.DYNAMODB_TABLE_NAME || 'EventFlow (default)',
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    },
    databaseStatus: 'checking...',
    databaseError: null,
  };

  try {
    // Attempt a simple scan of 1 item to verify connection and permissions
    await db.send(
      new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME || 'EventFlow',
        Limit: 1,
      })
    );
    diagnostics.databaseStatus = 'connected_successfully';
  } catch (err: any) {
    diagnostics.databaseStatus = 'connection_failed';
    diagnostics.databaseError = {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    };
  }

  return NextResponse.json(diagnostics);
}
