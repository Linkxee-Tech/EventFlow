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
            <li>Navigate to <strong>EventFlow</strong></li>
            <li>Click <strong>"Sign in"</strong> in the top-right corner</li>
            <li>Choose your preferred sign-in method:
              <ul className="list-disc pl-5 mt-1">
                <li><strong>Google OAuth</strong> — One-click sign-in with your Google account</li>
                <li><strong>Email & Password</strong> — Standard secure sign in</li>
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
            <li>Go to <strong>Dashboard</strong> → <strong>Settings</strong></li>
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
            <li>From the <strong>Dashboard</strong>, click the <strong>"Create Event"</strong> button</li>
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
              </ul>
            </div>
            <div>
              <strong className="text-white block">Step 2: Ticket Tiers</strong>
              <ul className="list-disc pl-5 mt-1">
                <li>Click <strong>"Add Tier"</strong> to create different ticket types:</li>
                <li><strong>Tier Name</strong> — e.g., "Early Bird", "VIP"</li>
                <li><strong>Price</strong> — Set the price in your local currency</li>
                <li><strong>Capacity</strong> — How many tickets are available?</li>
                <li><strong>Max Per Order</strong> — Limit how many tickets one person can buy</li>
              </ul>
            </div>
            <div>
              <strong className="text-white block">Step 3: Media & AI Flyer</strong>
              <ul className="list-disc pl-5 mt-1">
                <li><strong>Upload a flyer</strong> — Drag and drop your own image OR</li>
                <li><strong>✨ Generate AI Flyer</strong> — Enter a theme (e.g., "Retro 80s") and click generate. AI will create a marketing image and social captions!</li>
              </ul>
            </div>
            <div>
              <strong className="text-white block">Step 4: Review & Publish</strong>
              <ul className="list-disc pl-5 mt-1">
                <li>Review all event details and click <strong>"Publish Event"</strong></li>
              </ul>
            </div>
          </div>

          <h3 className="text-white text-lg font-medium mt-8">2.3 Managing Sales & Attendees</h3>
          <p className="mt-2">Once your event is live, the <strong>Dashboard</strong> gives you real-time insights.</p>
          <p className="mt-2"><strong>Viewing Attendees:</strong> Click on any event → view the Attendee List to see a full list of buyers with Check-in status (✔ Checked In / ⏳ Pending) and the ability to issue refunds.</p>

          <h3 className="text-white text-lg font-medium mt-8">2.4 Day-of-Event Check-in (QR Scanner)</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Open your event → Click the <strong>"Scanner"</strong> button</li>
            <li>Grant camera access when prompted</li>
            <li>Hold the attendee's QR code in front of the camera:
              <ul className="list-disc pl-5 mt-1">
                <li>✅ <strong>Green Flash</strong> — Ticket is valid</li>
                <li>❌ <strong>Red Flash</strong> — Invalid or already used</li>
              </ul>
            </li>
            <li><strong>Offline Mode:</strong> The scanner caches valid tickets. If the venue has no Wi-Fi, you can still scan!</li>
            <li><strong>Manual Fallback:</strong> You can also manually toggle check-ins from the Attendee List.</li>
          </ol>

          <h3 className="text-white text-lg font-medium mt-8">2.5 Payouts & Finances</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to <strong>Dashboard</strong> → <strong>Payouts</strong></li>
            <li>View your Pending Balance and Transaction History.</li>
            <li>Stripe automatically transfers funds to your connected bank account on your schedule.</li>
          </ol>
        </section>

        <section className="prose prose-invert prose-indigo max-w-none">
          <h2 className="text-white text-2xl font-semibold border-b border-white/10 pb-2">🛒 3. For Attendees</h2>
          
          <h3 className="text-white text-lg font-medium mt-6">3.1 Finding an Event</h3>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Go to the <strong>EventFlow homepage</strong></li>
            <li>Use the <strong>search bar</strong> to find events by Event name, Location, or Date.</li>
          </ul>

          <h3 className="text-white text-lg font-medium mt-8">3.2 Buying Tickets</h3>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>On the event page, select your ticket tier(s)</li>
            <li>Click <strong>"Buy Tickets"</strong></li>
            <li>You'll see a <strong>countdown timer</strong> (10 minutes) — EventFlow is holding your tickets!</li>
            <li>Review the price breakdown (EventFlow Fee: 2.5% + $0.30)</li>
            <li>Enter your card details securely and click <strong>"Pay"</strong></li>
          </ol>

          <h3 className="text-white text-lg font-medium mt-8">3.3 Receiving Your Tickets</h3>
          <p className="mt-2">After payment, you'll be redirected to a Confirmation Page with a <strong>Dynamic QR Code</strong> and an "Add to Calendar" button. You will also receive an email receipt.</p>

          <h3 className="text-white text-lg font-medium mt-8">3.4 Using Your Ticket at the Door</h3>
          <p className="mt-2">Open your confirmation email, show the QR code to the organizer, and enjoy the event!</p>
        </section>

        <section className="prose prose-invert prose-indigo max-w-none">
          <h2 className="text-white text-2xl font-semibold border-b border-white/10 pb-2">❓ 4. Frequently Asked Questions</h2>
          <div className="space-y-4 mt-6">
            <div>
              <strong className="text-white block">Q: How do fees work?</strong>
              <p className="text-sm mt-1">EventFlow charges 2.5% + $0.30 per ticket sold. This is deducted from the total ticket price before the organizer receives their payout.</p>
            </div>
            <div>
              <strong className="text-white block">Q: Can I refund an attendee?</strong>
              <p className="text-sm mt-1">Yes. Go to the attendee list for your event, find the buyer, and click "Refund". The refund will be processed via Stripe and the ticket will be invalidated.</p>
            </div>
            <div>
              <strong className="text-white block">Q: How do I contact support?</strong>
              <p className="text-sm mt-1">Email us at support@eventflow.com.</p>
            </div>
          </div>
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
