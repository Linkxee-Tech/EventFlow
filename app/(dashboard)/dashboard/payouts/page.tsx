import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUser, listRecentOrdersByOrganizer } from '@/lib/db';
import { getConnectAccountBalance } from '@/lib/stripe';
import { formatCents } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Payouts' };

export default async function PayoutsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? '';
  const profile = await getUser(userId);

  let balance = { available: 0, pending: 0 };
  if (profile?.stripeAccountId && profile.stripeOnboardingComplete) {
    balance = await getConnectAccountBalance(profile.stripeAccountId).catch(
      () => ({ available: 0, pending: 0 })
    );
  }

  const isConnected = !!profile?.stripeOnboardingComplete;
  const orders = await listRecentOrdersByOrganizer(userId);

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your earnings and transfer history</p>
        </div>
        {isConnected && (
          <Button>Transfer to Bank</Button>
        )}
      </div>

      {/* Stripe Connect banner */}
      {!isConnected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm text-amber-400">Stripe not connected — connect to receive payouts</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Set up your Stripe account to start collecting payments from ticket sales.
              Direct deposit to your bank account, usually within 2 business days.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/settings">
                Connect Stripe <ExternalLink className="h-3 w-3 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Balance card */}
      <div className="bg-gradient-to-br from-primary to-purple-600 rounded-2xl p-7">
        <p className="text-sm text-white/70 mb-2">Available balance</p>
        <p className="text-4xl font-bold text-white tracking-tight">
          {formatCents(balance.available)}
        </p>
        <div className="flex gap-6 mt-5">
          <div>
            <p className="text-xs text-white/60">Pending</p>
            <p className="text-sm font-semibold text-white">{formatCents(balance.pending)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">Fee rate</p>
            <p className="text-sm font-semibold text-white">2.5% + $0.30</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-card border rounded-xl">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-medium">Transaction history</h2>
        </div>
        <div className="divide-y">
          {orders.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No transactions yet.
            </div>
          ) : (
            orders.map((tx) => (
              <div key={tx.orderId} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                  <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Ticket sales — Order #{tx.orderId.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-500">
                  +{formatCents(tx.totalAmount - tx.platformFee)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
