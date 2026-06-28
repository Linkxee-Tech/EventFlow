'use client';

import { Share2 } from 'lucide-react';

export function ShareButton({ eventName, eventSlug }: { eventName: string, eventSlug: string }) {
  return (
    <button
      onClick={async () => {
        const url = window.location.origin + `/events/${eventSlug}`;
        if (navigator.share) {
          try {
            await navigator.share({
              title: eventName,
              text: `I'm going to ${eventName}! Get your tickets on EventFlow.`,
              url,
            });
          } catch (e) {}
        } else {
          await navigator.clipboard.writeText(url);
          alert('Link copied to clipboard!');
        }
      }}
      className="flex flex-col items-center gap-1.5 bg-[#1A1A2E] border border-white/8 hover:border-white/20 rounded-xl py-3 px-2 transition-colors group"
    >
      <Share2 className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
      <span className="text-[10px] text-slate-400 group-hover:text-white transition-colors text-center">
        Share Event
      </span>
    </button>
  );
}
