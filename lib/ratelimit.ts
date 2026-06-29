/**
 * lib/ratelimit.ts — Upstash Redis rate limiting.
 * Protects /api/tickets/reserve from inventory hold abuse.
 * Falls back gracefully if UPSTASH_REDIS_REST_URL is not configured (dev mode).
 */

let Ratelimit: any = null;
let Redis: any = null;

async function getClients() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!Ratelimit) {
    const upstash = await import('@upstash/ratelimit');
    const redis = await import('@upstash/redis');
    Ratelimit = upstash.Ratelimit;
    Redis = redis.Redis;
  }
  return { Ratelimit, Redis };
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier (IP address or user ID).
 * Returns { success: true } if under limit, { success: false } if exceeded.
 * Returns { success: true } unconditionally if Upstash is not configured (dev mode).
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string = 'default'
): Promise<RateLimitResult> {
  const clients = await getClients();

  // Dev mode — no rate limiting
  if (!clients) {
    return { success: true, limit: 5, remaining: 5, reset: Date.now() + 60_000 };
  }

  const { Ratelimit: RL, Redis: R } = clients;

  try {
    const redis = new R({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const limiter = new RL({
      redis,
      limiter: RL.slidingWindow(5, '1 m'), // 5 requests per minute per IP
      prefix: `eventflow:${endpoint}`,
    });

    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.warn('[ratelimit] Failed to connect to Redis. Falling back to allowed.', error);
    return { success: true, limit: 5, remaining: 5, reset: Date.now() + 60_000 };
  }
}

/**
 * Returns Next.js-compatible rate limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };
}
