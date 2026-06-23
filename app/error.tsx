'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[EventFlow Error]', error.digest, error.message);
    }
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-6">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
          <p className="text-slate-400 text-sm mb-2 max-w-sm">
            We encountered an unexpected error. Your payment has not been charged if you were mid-checkout.
          </p>
          {error.digest && (
            <p className="text-slate-600 text-xs mb-6 font-mono">Error ID: {error.digest}</p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              Try again
            </button>
            <a
              href="/"
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
