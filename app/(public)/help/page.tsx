import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help & User Guide — EventFlow',
  description: 'Everything you need to know to create events and buy tickets on EventFlow.',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] text-slate-300 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">🎟️ EventFlow User Guide</h1>
          <p className="text-lg text-slate-400">Version 1.0 | Fair-trade ticketing for independent creators</p>
        </div>

        <section className="prose prose-invert prose-indigo max-w-none">
          <h2 className="text-white text-2xl font-semibold border-b border-white/10 pb-2">📖 Welcome to EventFlow</h2>
          <p>
            EventFlow is the ticketing platform that puts <strong>creators first</strong>. We charge a transparent <strong>2.5% + $0.30</strong> per ticket — no hidden fees, no surprise charges at checkout. Our atomic inventory system guarantees that <strong>you will never oversell</strong> a ticket, even during viral traffic spikes.
          </p>
          <p>
            This guide will walk you through everything you need to know, whether you're creating your first event or buying your first ticket.
          </p>
        </section>

        <section className="prose prose-invert prose-indigo max-w-none">
          <h2 className="text-white text-2xl font-semibold border-b border-white/10 pb-2">🔐 1. Getting Started</h2>
          <h3 className="text-white text-lg font-medium mt-6">Creating Your Account</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Navigate to <strong>EventFlow</strong> (<code>https://eventflow.vercel.app</code>)</li>
            <li>Click <strong>"Sign in"</strong> in the top-right corner</li>
            <li>Choose your preferred sign-in method:
              <ul className="list-disc pl-5 mt-1">
                <li><strong>Google OAuth</strong> — One-click sign-in with your Google account</li>
                <li><strong>Magic Link</strong> — Enter your email, and we'll send you a secure one-time login link</li>
              </ul>
            </li>
            <li>That's it! You're now signed in and ready to go.</li>
          </ol>
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-4 rounded-xl mt-4">
            <strong>💡 Pro Tip:</strong> If you're an organizer, you'll be prompted to connect your Stripe account during your first event creation. This ensures you get paid instantly when tickets sell.
          </div>
        </section>

        <section className="prose prose-invert prose-indigo max-w-none">
          <h2 className="text-white text-2xl font-semibold border-b border-white/10 pb-2">🎪 2. For Event Organizers</h2>
          
          <h3 className="text-white text-lg font-medium mt-6">2.1 Connecting Stripe (Getting Paid)</h3>
          <p>Before you can sell tickets, you need to connect EventFlow to your bank account via Stripe Connect.</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to <strong>Dashboard</strong> → <strong>Settings</strong> (gear icon in the sidebar)</li>
            <li>Click <strong>"Connect Stripe Account"</strong></li>
            <li>You'll be redirected to Stripe. Complete the onboarding:
              <ul className="list-disc pl-5 mt-1">
                <li>Provide your business/legal details</li>
                <li>Enter your bank account information</li>
              </ul>
            </li>
            <li>Once complete, you'll be redirected back to EventFlow. Your Stripe account is now linked!</li>
          </ol>
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl mt-4">
            <strong>🔒 Security:</strong> EventFlow never touches your funds. Stripe handles all payment processing and transfers money directly to your bank. We simply take our 2.5% + $0.30 fee at checkout.
          </div>

          <h3 className="text-white text-lg font-medium mt-8">2.2 Creating Your First Event</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>From the <strong>Dashboard</strong>, click the <strong>"Create Event"</strong> button (or the "+" icon)</li>
            <li>Follow the <strong>4-step wizard</strong>:</li>
          </ol>
          <div className="pl-5 mt-4 space-y-4">
            <div>
              <strong className="text-white block">Step 1: Event Details</strong>
              <ul className="list-disc pl-5 mt-1">
                <li><strong>Event Name</strong> — e.g., "Retro Synthwave Coding Workshop"</li>
                <li><strong>Description</strong> — Tell attendees what to expect</li>
                <li><strong>Date & Time</strong> — Set the start and end times</li>
                <li><strong>Venue</strong> — Enter the physical address or virtual meeting link</li>
                <li><strong>Map</strong> — The location will auto-populate on a map</li>
              </ul>
            </div>
            <div>
              <strong className="text-white block">Step 2: Ticket Tiers</strong>
              <ul className="list-disc pl-5 mt-1">
                <li>Click <strong>"Add Tier"</strong> to create different ticket types:</li>
                <li><strong>Tier Name</strong> — e.g., "Early Bird", "General Admission", "VIP"</li>
                <li><strong>Price</strong> — Set the price in your local currency (USD, NGN, ZAR, GHS, etc.)</li>
                <li><strong>Capacity</strong> — How many tickets are available for this tier?</li>
                <li><strong>Max Per Order</strong> — Limit how many tickets one person can buy</li>
                <li>You can add multiple tiers (e.g., $15 Early Bird, $25 General, $50 VIP)</li>
              </ul>
            </div>
            <div>
              <strong className="text-white block">Step 3: Media & AI Flyer</strong>
              <ul className="list-disc pl-5 mt-1">
                <li><strong>Upload a flyer</strong> — Drag and drop your own image OR</li>
                <li><strong>✨ Generate AI Flyer</strong> — Enter a theme (e.g., "Retro 80s" or "Minimalist") and click generate. GPT-4 will create a marketing image and social captions in seconds!</li>
              </ul>
            </div>
            <div>
              <strong className="text-white block">Step 4: Review & Publish</strong>
              <ul className="list-disc pl-5 mt-1">
                <li>Review all event details</li>
                <li>Toggle <strong>"Go Live"</strong> to make the event visible to the public</li>
                <li>Click <strong>"Publish Event"</strong></li>
              </ul>
            </div>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-4 rounded-xl mt-4">
            🎉 Your event is now live! Share the public URL (<code>/events/your-event-slug</code>) with your audience.
          </div>

          <h3 className="text-white text-lg font-medium mt-8">2.3 Managing Sales & Attendees</h3>
          <p className="mt-2">Once your event is live, the <strong>Dashboard</strong> gives you real-time insights:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>KPIs</strong>: Total revenue, tickets sold, active events</li>
            <li><strong>Revenue Chart</strong>: Daily sales trend for the last 30 days</li>
            <li><strong>Recent Activity</strong>: Live feed of ticket purchases as they happen</li>
            <li><strong>Event List</strong>: All your events with status badges (Draft / Live / Ended / Cancelled)</li>
          </ul>
          <p className="mt-4"><strong>Viewing Attendees:</strong></p>
          <ul className="list-disc pl-5 mt-1">
            <li>Click on any event → <strong>"Attendees"</strong> tab</li>
            <li>See a full list of buyers with Name & Email, Ticket Tier purchased, and Check-in status (✔ Checked In / ⏳ Pending)</li>
          </ul>

          <h3 className="text-white text-lg font-medium mt-8">2.4 Day-of-Event Check-in (QR Scanner)</h3>
          <p className="mt-2">On the day of your event, you'll check in attendees using the built-in QR scanner.</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Open your event → Click the <strong>"Check-in"</strong> tab (or <strong>"Scan Tickets"</strong> button)</li>
            <li>Grant camera access when prompted</li>
            <li>Hold the attendee's QR code in front of the camera:
              <ul className="list-disc pl-5 mt-1">
                <li>✅ <strong>Green Flash + "Check-in Successful for [Name]"</strong> — Ticket is valid and being used for the first time</li>
                <li>❌ <strong>Red Flash + "Invalid or Already Used"</strong> — Ticket is either fake, already scanned, or doesn't exist</li>
              </ul>
            </li>
            <li><strong>Offline Mode:</strong> The scanner caches valid tickets. If the venue has no Wi-Fi, you can still scan! The sync will complete automatically when the connection returns.</li>
            <li><strong>Manual Fallback:</strong> If the QR code won't scan, click <strong>"Enter code manually"</strong> and type the ticket ID.</li>
          </ol>

          <h3 className="text-white text-lg font-medium mt-8">2.5 Payouts & Finances</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to <strong>Dashboard</strong> → <strong>Payouts</strong></li>
            <li>View your <strong>Pending Balance</strong> (Total earned from ticket sales minus our fees) and <strong>Transaction History</strong> (Every sale, including fees and net payout).</li>
            <li>Stripe automatically transfers funds to your connected bank account on your schedule (e.g., daily, weekly, or custom).</li>
          </ol>
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-4 rounded-xl mt-4">
            💰 <strong>Fee Transparency:</strong> We charge <strong>2.5% + $0.30</strong> per ticket. This is the <em>only</em> fee. No monthly subscriptions, no hidden service charges.
          </div>
        </section>

        <section className="prose prose-invert prose-indigo max-w-none">
          <h2 className="text-white text-2xl font-semibold border-b border-white/10 pb-2">🛒 3. For Attendees</h2>
          
          <h3 className="text-white text-lg font-medium mt-6">3.1 Finding an Event</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to the <strong>EventFlow homepage</strong></li>
            <li>Browse the <strong>"Featured Events"</strong> grid OR</li>
            <li>Use the <strong>search bar</strong> to find events by Event name, Location (e.g., "Lagos", "Cape Town"), or Date.</li>
            <li>Click on any event card to view the full details.</li>
          </ol>

          <h3 className="text-white text-lg font-medium mt-8">3.2 Buying Tickets</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>On the event page, select your ticket tier(s) using the <strong>quantity selector</strong></li>
            <li>The <strong>live availability counter</strong> shows exactly how many tickets remain</li>
            <li>Click <strong>"Buy Tickets"</strong></li>
            <li>You'll see a <strong>countdown timer</strong> (10 minutes) — EventFlow is holding your tickets!</li>
            <li>Review the <strong>price breakdown</strong>: Ticket price × Quantity, EventFlow Fee (2.5% + $0.30), and Total</li>
            <li>Enter your <strong>email address</strong> (tickets will be sent here)</li>
            <li>Fill in your <strong>billing address</strong> (required for Stripe)</li>
            <li>Enter your card details in the secure Stripe payment element</li>
            <li>Click <strong>"Pay"</strong></li>
          </ol>
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl mt-4">
            🔐 <strong>Security:</strong> Your payment information is handled directly by Stripe. EventFlow never sees or stores your credit card details.
          </div>

          <h3 className="text-white text-lg font-medium mt-8">3.3 Receiving Your Tickets</h3>
          <p className="mt-2">After payment:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>You'll be redirected to a <strong>Confirmation Page</strong> with an Order summary, a <strong>Dynamic QR Code</strong> (refreshes every 30 seconds to prevent screenshot fraud), and an <strong>"Add to Google/Apple Calendar"</strong> button.</li>
            <li>You'll receive an <strong>email receipt</strong> with Event details, Your QR code ticket, and EventFlow contact information.</li>
          </ol>

          <h3 className="text-white text-lg font-medium mt-8">3.4 Using Your Ticket at the Door</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>On the day of the event, open your <strong>confirmation email</strong> or visit <strong>`/tickets/[ticketId]`</strong></li>
            <li>Show the QR code to the organizer</li>
            <li>The organizer will scan it with their phone</li>
            <li>✅ You're checked in! Enjoy the event.</li>
          </ol>
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-4 rounded-xl mt-4">
            💡 <strong>What if I lose my ticket?</strong> Don't worry! You can always access your ticket by logging in and going to <strong>"My Tickets"</strong> (available in the navigation). We'll also resend it via email if you request it.
          </div>
        </section>

        <section className="prose prose-invert prose-indigo max-w-none">
          <h2 className="text-white text-2xl font-semibold border-b border-white/10 pb-2">❓ 4. Frequently Asked Questions</h2>
          <div className="space-y-4 mt-6">
            <div>
              <strong className="text-white block">Q: How do fees work?</strong>
              <p className="text-sm mt-1">EventFlow charges <strong>2.5% + $0.30</strong> per ticket sold. This is deducted from the total ticket price before the organizer receives their payout. The fee is shown to attendees at checkout so everyone knows exactly what they're paying.</p>
            </div>
            <div>
              <strong className="text-white block">Q: Can I change my event after publishing?</strong>
              <p className="text-sm mt-1">Yes! Go to <strong>Dashboard</strong> → <strong>Events</strong> → Click your event → <strong>"Edit"</strong>. You can update details, add/remove ticket tiers, or even cancel the event.</p>
            </div>
            <div>
              <strong className="text-white block">Q: What happens if an event is cancelled?</strong>
              <p className="text-sm mt-1">If you cancel an event, we recommend reaching out to attendees directly via email (we can provide a list of buyer emails). EventFlow can issue full refunds through Stripe if needed. Contact our support team for assistance.</p>
            </div>
            <div>
              <strong className="text-white block">Q: Do you support multiple currencies?</strong>
              <p className="text-sm mt-1">We currently support USD, NGN, ZAR, and GHS. More currencies are coming soon!</p>
            </div>
            <div>
              <strong className="text-white block">Q: Is there a free plan?</strong>
              <p className="text-sm mt-1">Yes! The <strong>first 100 tickets per month are completely free</strong>. After that, our standard 2.5% + $0.30 fee applies. No subscriptions, no monthly fees.</p>
            </div>
            <div>
              <strong className="text-white block">Q: How do I contact support?</strong>
              <p className="text-sm mt-1">Email us at <strong>support@eventflow.com</strong> or use the chat widget on the bottom-right of the screen. We typically respond within 2 hours.</p>
            </div>
            <div>
              <strong className="text-white block">Q: Can I refund an attendee?</strong>
              <p className="text-sm mt-1">Yes. Go to the attendee list for your event, find the buyer, and click <strong>"Refund"</strong>. The refund will be processed via Stripe and the ticket will be invalidated. (Note: Stripe may keep its processing fee.)</p>
            </div>
          </div>
        </section>

        <section className="prose prose-invert prose-indigo max-w-none">
          <h2 className="text-white text-2xl font-semibold border-b border-white/10 pb-2">🚀 5. Getting the Most Out of EventFlow</h2>
          <ul className="list-disc pl-5 space-y-2 mt-4">
            <li><strong>Use AI Flyer Generator</strong>: Save hours on marketing design — get professional assets instantly.</li>
            <li><strong>Enable Early Bird Tiers</strong>: Create urgency and drive early sales.</li>
            <li><strong>Monitor Your Dashboard</strong>: Track sales in real-time to adjust your marketing strategy.</li>
            <li><strong>Test the Scanner Before the Event</strong>: Ensure your camera works and your Wi-Fi (or offline mode) is ready.</li>
            <li><strong>Share Social Captions</strong>: Use the AI-generated captions to promote your event on Instagram, Twitter, and LinkedIn.</li>
          </ul>
        </section>

        <section className="prose prose-invert prose-indigo max-w-none">
          <h2 className="text-white text-2xl font-semibold border-b border-white/10 pb-2">📞 6. Need Help?</h2>
          <ul className="list-disc pl-5 space-y-2 mt-4">
            <li><strong>Email:</strong> support@eventflow.com</li>
            <li><strong>Live Chat:</strong> Click the chat bubble in the bottom-right corner</li>
            <li><strong>Documentation:</strong> Visit `/help` for detailed technical docs</li>
            <li><strong>Hackathon Submission:</strong> <a href="https://h01.devpost.com" className="text-indigo-400">https://h01.devpost.com</a></li>
          </ul>
          <p className="mt-6 italic text-center">Thank you for choosing EventFlow. We're building a fairer future for independent creators — one ticket at a time. 🎟️✨</p>
        </section>

        <div className="pt-8 border-t border-white/10 text-center">
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 font-medium">
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
