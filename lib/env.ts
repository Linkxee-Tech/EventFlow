/**
 * lib/env.ts — Validate all required environment variables at module load time.
 * Any missing var throws immediately with a clear message, crashing the process
 * before serving a single request. This prevents silent runtime failures in prod.
 */

type EnvKey =
  | 'DYNAMODB_TABLE_NAME'
  | 'AWS_REGION'
  | 'AWS_ACCESS_KEY_ID'
  | 'AWS_SECRET_ACCESS_KEY'
  | 'STRIPE_SECRET_KEY'
  | 'STRIPE_WEBHOOK_SECRET'
  | 'NEXTAUTH_SECRET'
  | 'NEXTAUTH_URL';

const REQUIRED: EnvKey[] = [
  'DYNAMODB_TABLE_NAME',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

function validateEnv(): Record<EnvKey, string> {
  // Skip validation in test environment
  if (process.env.NODE_ENV === 'test') {
    return {} as Record<EnvKey, string>;
  }

  const missing: string[] = [];
  const validated: Partial<Record<EnvKey, string>> = {};

  for (const key of REQUIRED) {
    const val = process.env[key];
    if (!val || val.trim() === '') {
      missing.push(key);
    } else {
      validated[key] = val;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `\n\n❌ EventFlow: Missing required environment variables:\n` +
      missing.map((k) => `   • ${k}`).join('\n') +
      `\n\nCopy .env.example to .env.local and fill in all values.\n`
    );
  }

  return validated as Record<EnvKey, string>;
}

export const env = validateEnv();

// Typed accessors — never undefined after validation
export const ENV = {
  DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME ?? 'EventFlow',
  AWS_REGION: process.env.AWS_REGION ?? 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
  NEXT_PUBLIC_STRIPE_PK: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  QR_SECRET: process.env.QR_SECRET ?? 'dev-fallback-secret-change-in-prod',
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;
