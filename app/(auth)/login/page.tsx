'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const params = useSearchParams();
  const error = params.get('error');

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading('email');
    try {
      const result = await signIn('email', {
        email,
        redirect: false,
        callbackUrl: '/dashboard',
      });
      if (result?.error) {
        toast.error('Could not send login link. Try again.');
      } else {
        setEmailSent(true);
        toast.success('Magic link sent! Check your inbox.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setLoading('google');
    await signIn('google', { callbackUrl: '/dashboard' });
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4">🎟</div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Sign in to EventFlow</h1>
          <p className="text-sm text-slate-400 mt-1">Fair-trade ticketing for creators</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5 text-sm text-red-400 text-center">
            {error === 'OAuthSignin' ? 'Google sign-in failed. Please try again.' : 'Authentication error. Please try again.'}
          </div>
        )}

        {emailSent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">📬</div>
            <h2 className="font-semibold text-white mb-1">Check your email</h2>
            <p className="text-sm text-slate-400">
              We sent a magic link to <strong className="text-white">{email}</strong>
            </p>
            <button
              onClick={() => setEmailSent(false)}
              className="mt-4 text-xs text-indigo-400 hover:text-indigo-300"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-6 space-y-4">
            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60"
            >
              {loading === 'google' ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-slate-500">or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Magic link */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading !== null || !email}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading === 'email' ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : '✉️'}
                Send magic link
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-6">
          Don't have an account?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
