// public/sw.js — EventFlow Service Worker v2
// Phase 6: Offline QR scanning via cached ticket hashes

const CACHE_NAME = 'eventflow-v2';
let ticketCache = {}; // { [eventId]: { ticketId, qrHash, buyerName, tierId }[] }

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Receive preloaded hashes from main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_HASHES') {
    const { eventId, hashes } = event.data;
    ticketCache[eventId] = hashes;
  }
});

// Intercept /api/tickets/scan when offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== '/api/tickets/scan' || event.request.method !== 'POST') return;

  event.respondWith(
    fetch(event.request.clone()).catch(async () => {
      try {
        const body = await event.request.json();
        const { ticketId, eventId } = body;
        const cached = ticketCache[eventId] ?? [];
        const match = cached.find((h) => h.ticketId === ticketId);

        const data = match
          ? { valid: true, attendeeName: match.buyerName, tierName: 'Offline scan', message: `Welcome ${match.buyerName}! (offline — syncs on reconnect)` }
          : { valid: false, message: 'Ticket not in offline cache' };

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ success: false, error: 'Offline' }), {
          status: 503, headers: { 'Content-Type': 'application/json' },
        });
      }
    })
  );
});
