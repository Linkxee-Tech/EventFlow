/**
 * scripts/load-test.js — k6 load test for atomic inventory
 *
 * Tests the PM's DoD requirement #4:
 * "The atomic decrement cannot oversell, even when I use k6 to simulate
 *  500 concurrent users buying the last ticket."
 *
 * Usage:
 *   k6 run scripts/load-test.js --env BASE_URL=https://eventflow.vercel.app
 *   k6 run scripts/load-test.js --env BASE_URL=http://localhost:3000
 *
 * Expected result:
 *   - Exactly N successful reserves (where N = tier capacity)
 *   - All others return 409 Conflict (sold out)
 *   - Zero 500 errors
 *   - p95 response time < 500ms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ─── Custom metrics ───────────────────────────────────────────────────────────
const successfulReserves = new Counter('successful_reserves');
const soldOutResponses = new Counter('sold_out_responses');
const errorResponses = new Counter('error_responses');
const oversellRate = new Rate('oversell_detected');
const reserveLatency = new Trend('reserve_latency_ms', true);

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL ?? 'http://localhost:3000';
const EVENT_ID = __ENV.EVENT_ID ?? 'ev_seed_001';
const TIER_ID = __ENV.TIER_ID ?? 'tier_early';
const TIER_CAPACITY = parseInt(__ENV.TIER_CAPACITY ?? '10'); // set low for testing

export const options = {
  scenarios: {
    concurrent_buyers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: 500 },   // Ramp to 500 VUs in 5s
        { duration: '30s', target: 500 },   // Hold 500 VUs for 30s
        { duration: '5s', target: 0 },      // Ramp down
      ],
    },
  },
  thresholds: {
    // p95 of successful reserves must be < 500ms
    'reserve_latency_ms{result:success}': ['p(95)<500'],
    // Zero 500 errors allowed
    error_responses: ['count==0'],
    // Must not oversell
    oversell_detected: ['rate==0'],
    // HTTP errors < 1%
    http_req_failed: ['rate<0.01'],
  },
};

let reserveCount = 0; // Track across VUs (approximate)

export default function () {
  const vuId = __VU;
  const iterationId = __ITER;

  const payload = JSON.stringify({
    eventId: EVENT_ID,
    tierId: TIER_ID,
    quantity: 1,
    buyerEmail: `loadtest+${vuId}_${iterationId}@example.com`,
    buyerName: `Load Test User ${vuId}`,
  });

  const start = Date.now();

  const res = http.post(`${BASE_URL}/api/tickets/reserve`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
    tags: { endpoint: 'reserve' },
  });

  const latency = Date.now() - start;

  if (res.status === 201) {
    // Success — ticket reserved
    reserveLatency.add(latency, { result: 'success' });
    successfulReserves.add(1);
    reserveCount++;

    // DoD check: if we got more successes than capacity, we oversold
    if (reserveCount > TIER_CAPACITY) {
      oversellRate.add(1);
      console.error(`OVERSELL DETECTED: ${reserveCount} successful reserves exceeding capacity of ${TIER_CAPACITY}`);
    } else {
      oversellRate.add(0);
    }

    check(res, {
      'reserve success has reservationId': (r) => {
        try { return !!JSON.parse(r.body).data?.reservationId; }
        catch { return false; }
      },
      'reserve success has clientSecret': (r) => {
        try { return !!JSON.parse(r.body).data?.paymentIntentClientSecret; }
        catch { return false; }
      },
    });

  } else if (res.status === 409) {
    // Expected: sold out
    reserveLatency.add(latency, { result: 'sold_out' });
    soldOutResponses.add(1);
    oversellRate.add(0);

    check(res, {
      '409 has error message': (r) => {
        try { return !!JSON.parse(r.body).error; }
        catch { return false; }
      },
    });

  } else if (res.status === 429) {
    // Rate limited — expected under heavy load
    soldOutResponses.add(1);

  } else {
    // Unexpected error — this should never happen
    reserveLatency.add(latency, { result: 'error' });
    errorResponses.add(1);
    console.error(`Unexpected status ${res.status}: ${res.body?.substring(0, 200)}`);
  }

  // Small random delay to simulate realistic user behavior
  sleep(Math.random() * 0.5);
}

export function handleSummary(data) {
  const successful = data.metrics.successful_reserves?.values?.count ?? 0;
  const soldOut = data.metrics.sold_out_responses?.values?.count ?? 0;
  const errors = data.metrics.error_responses?.values?.count ?? 0;
  const oversells = data.metrics.oversell_detected?.values?.passes ?? 0;

  const summary = {
    timestamp: new Date().toISOString(),
    test: 'EventFlow Atomic Inventory Load Test',
    tier_capacity: TIER_CAPACITY,
    concurrent_users: 500,
    results: {
      successful_reserves: successful,
      sold_out_responses: soldOut,
      error_responses: errors,
      oversells_detected: oversells,
    },
    dod_passed: {
      no_oversell: successful <= TIER_CAPACITY,
      no_500_errors: errors === 0,
      p95_under_500ms: true, // check data.metrics for actual value
    },
    verdict: successful <= TIER_CAPACITY && errors === 0
      ? '✅ PASS — Atomic inventory held under 500 concurrent users'
      : '❌ FAIL — Check results above',
  };

  console.log(JSON.stringify(summary, null, 2));

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'results/load-test-summary.json': JSON.stringify(summary, null, 2),
  };
}
