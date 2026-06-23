'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    fetch('/api/user/me')
      .then((r) => r.json())
      .then((j) => {
        setProfile(j.data);
        setName(j.data?.name ?? '');
      })
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false));
  }, []);

  async function handleConnectStripe() {
    setConnecting(true);
    try {
      const res = await fetch('/api/stripe/onboard');
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? 'Could not start Stripe setup'); return; }
      window.location.href = json.data.onboardingUrl;
    } catch {
      toast.error('Network error. Try again.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { toast.error('Could not update name'); return; }
      toast.success('Name updated');
    } catch { toast.error('Network error'); }
    finally { setSavingName(false); }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  const isStripeConnected = profile?.stripeOnboardingComplete;

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your account and payment configuration</p>
      </div>

      {/* Profile */}
      <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-6">
        <h2 className="text-sm font-medium mb-4">Profile</h2>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Email</label>
            <input
              value={profile?.email ?? ''}
              disabled
              className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={savingName || !name}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
          >
            {savingName && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save changes
          </button>
        </form>
      </div>

      {/* Stripe Connect */}
      <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-6">
        <h2 className="text-sm font-medium mb-1">Stripe Payouts</h2>
        <p className="text-xs text-slate-400 mb-5">
          Connect your Stripe account to receive direct payouts from ticket sales.
          Funds transfer within 2 business days.
        </p>

        {isStripeConnected ? (
          <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-300">Stripe account connected</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Account ID: <span className="font-mono">{profile?.stripeAccountId}</span>
              </p>
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="mt-3 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Manage in Stripe dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300">Stripe not connected</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  You cannot publish events or receive payouts until you connect a Stripe account.
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {connecting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Connecting…</>
              ) : (
                <><ExternalLink className="h-4 w-4" />Connect Stripe Account</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Fee transparency */}
      <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-6">
        <h2 className="text-sm font-medium mb-3">Pricing</h2>
        <div className="space-y-2">
          {[
            ['Platform fee', '2.5% + $0.30 per ticket'],
            ['Payout schedule', '2–7 business days after event'],
            ['Refunds', 'Managed through EventFlow dashboard'],
            ['Chargebacks', 'Handled by Stripe — 0.15% + $15 per dispute'],
          ].map(([key, val]) => (
            <div key={key} className="flex justify-between text-sm py-2 border-b border-white/5 last:border-0">
              <span className="text-slate-400">{key}</span>
              <span className="text-white font-medium text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
