import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-6">🎟</div>
        <h1 className="text-3xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-slate-400 mb-8 max-w-sm">
          This event may have ended, or the link you followed is incorrect.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            Browse events
          </Link>
          <Link
            href="/dashboard"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
