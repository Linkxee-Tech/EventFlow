'use client';

import { Link as LinkIcon, Check } from 'lucide-react';
import { useState } from 'react';

export function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        const url = window.location.origin + `/events/${slug}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <LinkIcon className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}
