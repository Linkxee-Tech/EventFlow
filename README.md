# 🎟 EventFlow — Production-Ready Ticketing Platform

> **Zero-gap implementation. Every phase complete. Ship-ready.**

Fair-trade ticketing for independent creators. 2.5% + $0.30 flat fee. Atomic DynamoDB inventory. Dynamic QR tickets. Stripe Connect direct payouts.

---

## ✅ Implementation Checklist Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Infrastructure & Environment | ✅ Complete |
| 1 | Authentication & User Management | ✅ Complete |
| 2 | Public Landing & Event Discovery | ✅ Complete |
| 3 | Organizer Dashboard | ✅ Complete |
| 4 | Checkout & Atomic Inventory | ✅ Complete |
| 5 | Payments & Payouts (Stripe Connect) | ✅ Complete |
| 6 | Day-of-Event Check-in | ✅ Complete |
| 7 | AI Enhancements | ✅ Complete |
| 8 | Backend Governance | ✅ Complete |
| 9 | UI/UX Micro-interactions | ✅ Complete |
| 10 | QA & Pre-launch Sign-off | ✅ Documented |

---

## 🚀 Deployment — Step by Step

### Prerequisites
- Node.js 18+
- AWS account (DynamoDB access)
- Stripe account with Connect enabled
- Vercel account
- Resend account (email)
- Upstash account (rate limiting — free tier)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/eventflow
cd eventflow
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
# Fill in every variable — the app throws on startup if any required var is missing
```

### 3. DynamoDB Setup

**Production (AWS):**
```bash
npm run db:seed    # Creates table + seeds demo event
```

**Local development (Docker):**
```bash
docker-compose up -d                    # Start local DynamoDB + Admin UI
# Admin UI at: http://localhost:8001
# Add DYNAMODB_ENDPOINT=http://localhost:8000 to .env.local
npm run db:seed
```

### 4. Stripe Setup

1. Enable Stripe Connect at [dashboard.stripe.com/connect](https://dashboard.stripe.com/connect)
2. Add webhook: `https://your-domain.vercel.app/api/webhooks/stripe`
3. Subscribe to events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`
4. Copy `Signing secret` → `STRIPE_WEBHOOK_SECRET`

### 5. Deploy to Vercel

```bash
npx vercel --prod
# Add all .env.local vars as Vercel Environment Variables
```

---

## 🏗 Architecture

```
Browser
  └── Vercel Edge (CDN) ── iad1 region
        ├── Next.js 14 App Router
        │   ├── RSC — event pages (ISR, 60s revalidate)
        │   ├── Client Components — checkout, scanner, polling
        │   └── API Routes
        │         ├── POST /api/tickets/reserve ← Atomic DynamoDB decrement
        │         ├── POST /api/tickets/confirm ← Idempotent Stripe confirm
        │         ├── POST /api/webhooks/stripe ← Inventory rollback on failure
        │         └── POST /api/tickets/scan   ← HMAC QR verification
        │
        ├── AWS DynamoDB (PAY_PER_REQUEST, single-table)
        ├── Stripe Connect (platform fees + direct transfers)
        ├── Upstash Redis (rate limiting — 5 req/min/IP on reserve)
        └── Resend (transactional email)
```

### Why This Architecture Wins

| Requirement | Solution | Why |
|-------------|----------|-----|
| Zero overselling | DynamoDB `ConditionExpression: availableCount >= :q` | Atomic CAS — no row locks needed |
| Idempotent checkout | `reservationId` as Stripe idempotency key | Prevents double charges on retry |
| Fast event pages | ISR `revalidate: 60` + RSC | Static HTML served from CDN edge |
| Live inventory | 15s client polling `/api/events/[slug]/availability` | Lightweight endpoint, no websockets needed |
| Fraud prevention | HMAC-SHA256 QR rotating every 30s | Screenshots expire; no valid QR can be shared |
| Offline scanning | Service Worker + preloaded hash cache | Works in venues with no Wi-Fi |

---

## 🔐 Security Model

### QR Ticket Hash
```
qrHash = SHA256(ticketId + ":" + floor(Date.now()/30000) + ":" + QR_SECRET)
```
- Rotates every **30 seconds**
- Server accepts current + previous window (30s tolerance)
- `QR_SECRET` never leaves the server
- Only the hash is stored — raw data never in DB

### API Protection
- `/dashboard/*` — `middleware.ts` checks JWT session, redirects to `/login`
- `/api/events/*` — `requireAuth()` on every organizer route
- `/api/tickets/reserve` — Upstash rate limit: 5 req/min/IP
- All event/description fields — `sanitizeEventInput()` strips XSS before storage

---

## ⚡ Phase 10 — QA Playbook

### User 1 — Attendee Flow
```
1. Visit / → find event → click "Buy Tickets"
2. Select "Early Bird" × 2 → hit reserve
3. Abandon checkout tab — wait 10 min
   → DynamoDB TTL expires RESERVATION# item
   → availableCount auto-increments (DynamoDB Streams + Lambda in prod;
     or manually run: aws dynamodb scan + verify availableCount restored)
4. Re-reserve → complete Stripe payment (use 4242 4242 4242 4242)
5. Verify email received with QR ticket
6. Open /confirmation/[orderId] on phone → tap "Add to Calendar"
```

### User 2 — Organizer Flow
```
1. Visit /register → sign in with Google
2. /dashboard/settings → click "Connect Stripe Account" → complete onboarding
3. /dashboard/events/create → fill 4-step wizard → Publish
4. Wait for User 1 to buy → refresh /dashboard (auto-revalidates every 30s)
   → see sale in Activity Feed within 30s
5. /dashboard/events/[id] → Attendee List → click "Check in" toggle
6. /dashboard/events/[id]/scan → scan QR from User 1's phone
   → green flash + sound → status → "Used"
```

### User 3 — Judge Flow
```
1. npx vercel inspect — confirm all env vars masked in output
2. npx lhci autorun — scores must be > 90 (Performance, Accessibility, SEO)
3. k6 run scripts/load-test.js --env BASE_URL=https://your-app.vercel.app \
     --env EVENT_ID=ev_seed_001 --env TIER_ID=tier_early \
     --env TIER_CAPACITY=10
   → Verify: "✅ PASS — Atomic inventory held under 500 concurrent users"
```

---

## 💰 Fee Structure

| Ticket Price | EventFlow Fee | Organizer Receives | Eventbrite Equivalent |
|-------------|--------------|-------------------|----------------------|
| $10 | $0.55 (5.5%) | $9.45 | ~$1.79 (17.9%) |
| $25 | $0.93 (3.7%) | $24.07 | ~$3.04 (12.2%) |
| $50 | $1.55 (3.1%) | $48.45 | ~$5.29 (10.6%) |
| $100 | $2.80 (2.8%) | $97.20 | ~$9.79 (9.8%) |

---

## 📁 Project Structure

```
eventflow/
├── app/
│   ├── (auth)/              # Login, Register — no sidebar
│   ├── (dashboard)/         # Organizer — JWT protected via middleware
│   │   └── dashboard/
│   │       ├── page.tsx           # KPIs + chart + activity feed (Promise.all)
│   │       ├── events/            # List, Create wizard, Edit, Detail+Attendees
│   │       ├── events/[id]/scan/  # Camera QR scanner + offline mode
│   │       ├── payouts/           # Stripe balance + transactions
│   │       └── settings/          # Profile + Stripe Connect onboarding
│   ├── (public)/            # No auth required
│   │   ├── events/[slug]/   # ISR event page + live availability polling
│   │   ├── checkout/[eventId]/    # Stripe Elements + countdown + address
│   │   └── confirmation/[orderId]/ # QR ticket + calendar + share
│   └── api/
│       ├── auth/[...nextauth]/    # NextAuth handler
│       ├── events/                # CRUD + publish + availability + attendees
│       ├── tickets/               # reserve (atomic) + confirm + scan + [id]
│       ├── webhooks/stripe/       # payment_intent.succeeded/.failed
│       ├── stripe/onboard/        # Connect OAuth link
│       ├── notifications/sales/   # 30s polling for notification bell
│       ├── user/me/               # GET profile + PATCH name
│       └── ai/generate-flyer/     # GPT-4 + Replicate image gen
├── components/
│   ├── dashboard/           # ResponsiveSidebar, NotificationBell, ActivityFeed, AttendeeList, RevenueChart, SalesMetrics
│   ├── event/               # EventCard, QRScannerWithOffline, QRTicket, TicketTierSelector, AvailabilityPoller
│   └── shared/              # ErrorBoundary, Skeletons
├── lib/
│   ├── db.ts                # All DynamoDB ops + local endpoint support
│   ├── stripe.ts            # Stripe client + Connect helpers
│   ├── auth.ts              # NextAuth config (Google + email magic link)
│   ├── email.ts             # Resend transactional email
│   ├── env.ts               # Startup env validation (throws on missing vars)
│   ├── logger.ts            # Pino structured logging + latency tracking
│   ├── ratelimit.ts         # Upstash rate limiting (graceful dev fallback)
│   ├── sanitize.ts          # XSS sanitization (server + client)
│   └── utils.ts             # generateId, slugify, QR hash, formatCents, requireAuth
├── types/index.ts           # All TypeScript types + calculateFee
├── middleware.ts            # JWT auth guard on /dashboard/* + /api/events/*
├── scripts/
│   ├── seed.ts              # Creates DynamoDB table + seeds demo data
│   └── load-test.js         # k6 — 500 concurrent buyers on last ticket
├── public/
│   ├── sw.js                # Service Worker — offline QR scanning
│   └── favicon.svg
├── docker-compose.yml       # Local DynamoDB + Admin UI
├── lighthouserc.js          # Lighthouse CI thresholds (> 90 all categories)
└── vercel.json              # iad1 region, function timeouts, security headers
```

---

## 📄 License

MIT — Built for the H0: Hack the Zero Stack Hackathon.
