import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  
  let session = null;
  let sessionError = null;
  let decodedToken = null;
  let tokenError = null;

  try {
    session = await getServerSession(authOptions);
  } catch (e: any) {
    sessionError = e.message;
  }

  try {
    // next-auth/jwt getToken can parse it manually
    decodedToken = await getToken({ 
      req: request as any, 
      secret: 'eventflow-default-secret-do-not-use-in-real-prod' 
    });
  } catch (e: any) {
    tokenError = e.message;
  }

  const diagnostics: any = {
    cookies: cookieHeader.includes('next-auth.session-token') ? 'Session cookie exists!' : 'No session cookie found!',
    cookieList: cookieHeader.split(';').map(c => c.trim().split('=')[0]),
    session: session ? 'Found user!' : 'Null session',
    sessionError,
    decodedToken: decodedToken ? 'Valid Token!' : 'Null Token',
    tokenError,
    env: {
      hasAwsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasAwsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION || 'us-east-1 (default)',
      dynamoTable: process.env.DYNAMODB_TABLE_NAME || 'EventFlow (default)',
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'Not set (defaults to Vercel URL)',
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

    // Attempt to query GSI1
    try {
      await db.send(
        new QueryCommand({
          TableName: process.env.DYNAMODB_TABLE_NAME || 'EventFlow',
          IndexName: 'GSI1',
          KeyConditionExpression: 'SK = :sk',
          ExpressionAttributeValues: { ':sk': 'PROFILE' },
          Limit: 1,
        })
      );
      diagnostics.gsi1Status = 'connected_successfully';
    } catch (gsiErr: any) {
      diagnostics.gsi1Status = 'connection_failed';
      diagnostics.gsi1Error = {
        name: gsiErr?.name,
        message: gsiErr?.message,
      };
    }

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
