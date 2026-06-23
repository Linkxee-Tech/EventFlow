/**
 * lib/logger.ts — Structured logging via pino.
 * - Production: JSON output (Vercel log drain compatible)
 * - Development: Pretty-printed with pino-pretty
 * - All console.log() calls in API routes must use this instead.
 * - Tracks DynamoDB query latency and flags anything > 10ms.
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  // In production Vercel reads stdout as JSON — no pretty print needed
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
    : undefined,
  base: { service: 'eventflow' },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields from logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.cardNumber',
      'stripeSecretKey',
      'qrHash',
    ],
    censor: '[REDACTED]',
  },
});

// ─── DynamoDB query latency wrapper ──────────────────────────────────────────

const LATENCY_WARN_MS = 10;

export async function withLatencyLog<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - start);

    if (ms > LATENCY_WARN_MS) {
      logger.warn({ op: operationName, latency_ms: ms }, `DynamoDB slow query: ${ms}ms`);
    } else {
      logger.debug({ op: operationName, latency_ms: ms }, `DynamoDB query OK`);
    }

    return result;
  } catch (err: any) {
    const ms = Math.round(performance.now() - start);
    logger.error({ op: operationName, latency_ms: ms, err: err.message }, `DynamoDB error`);
    throw err;
  }
}

// ─── API route request logger ─────────────────────────────────────────────────

export function logRequest(method: string, path: string, extra?: Record<string, unknown>) {
  if (!isProd) return; // Only log in production to reduce noise in dev
  logger.info({ method, path, ...extra }, `${method} ${path}`);
}

export function logError(context: string, err: unknown, extra?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error({ context, message, stack, ...extra }, `Error in ${context}`);
}
