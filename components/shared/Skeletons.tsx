'use client';

// Reusable skeleton components for loading states (Phase 9)

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl overflow-hidden">
      <div className="h-24 bg-white/5 animate-pulse" />
      <div className="p-4 space-y-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
        <SkeletonBlock className="h-1.5 w-full rounded-full" />
      </div>
      <div className="px-4 pb-4 flex justify-between">
        <SkeletonBlock className="h-5 w-16 rounded-full" />
        <SkeletonBlock className="h-5 w-20" />
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-[#1A1A2E] border border-white/8 rounded-xl p-4">
      <div className="flex justify-between mb-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonBlock className="h-8 w-28 mb-2" />
      <SkeletonBlock className="h-3 w-32" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <SkeletonBlock className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function TierCardSkeleton() {
  return (
    <div className="border border-white/8 rounded-xl p-4 bg-[#1A1A2E]">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-48" />
          <SkeletonBlock className="h-1.5 w-full mt-3 rounded-full" />
        </div>
        <div className="text-right space-y-2 ml-4">
          <SkeletonBlock className="h-7 w-20" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
