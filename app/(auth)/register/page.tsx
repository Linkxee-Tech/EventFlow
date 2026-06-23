'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [sent, setSent] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading('email');
    try {
      const res = await signIn('email', { email, redirect: false, callbackUrl: '/dashboard' });
      if (res?.error) { toast.error('Could not send sign-up link.'); return; }
      setSent(true);
    } catch { toast.error('Network error. Try again.'); }
    finally { setLoading(null); }
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4">🎟</div>
          <h1 className="text-xl font-semibold text-white">Create your organizer account</h1>
          <p className="text-sm text-slate-400 mt-1">Free to start · 2.5% + $0.30 per ticket sold</p>
        </div>

        {sent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">📬</div>
            <h2 className="font-semibold text-white mb-1">Check your inbox</h2>
            <p className="text-sm text-slate-400">Magic link sent to <strong className="text-white">{email}</strong></p>
          </div>
        ) : (
          <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-6 space-y-4">
            <button
              onClick={() => { setLoading('google'); signIn('google', { callbackUrl: '/dashboard' }); }}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60"
            >
              {loading === 'google'
                ? <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                : <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              }
              Continue with Google
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-slate-500">or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Work email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <button type="submit" disabled={loading !== null || !email}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                {loading === 'email' && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Create account — it's free
              </button>
            </form>
            <p className="text-xs text-slate-600 text-center">By signing up you agree to our Terms of Service</p>
          </div>
        )}
        <p className="text-center text-xs text-slate-600 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
