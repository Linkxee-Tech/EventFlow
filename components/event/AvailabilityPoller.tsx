'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TicketTier } from '@/types';

interface AvailabilityMap {
  [tierId: string]: {
    available: number;
    total: number;
    soldOut: boolean;
  };
}

interface Props {
  slug: string;
  tiers: TicketTier[];
  /** Called with fresh availability data whenever a poll completes */
  onUpdate: (data: AvailabilityMap) => void;
}

const POLL_MS = 15_000;

export function AvailabilityPoller({ slug, tiers, onUpdate }: Props) {
  const [lastPoll, setLastPoll] = useState<Date | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/availability/${slug}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json();
      onUpdate(json.data ?? {});
      setLastPoll(new Date());
    } catch {
      // Silent — polling errors should not disrupt the page
    }
  }, [slug, onUpdate]);

  useEffect(() => {
    poll(); // Immediate first poll
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  // This component renders nothing visible — it's a behaviour hook
  return null;
}

/** Hook version for use inside TicketTierSelector */
export function useAvailability(slug: string, initialTiers: TicketTier[]) {
  const [availability, setAvailability] = useState<AvailabilityMap>(() => {
    const map: AvailabilityMap = {};
    initialTiers.forEach((t) => {
      map[t.tierId] = {
        available: t.availableCount,
        total: t.totalCapacity,
        soldOut: t.availableCount === 0,
      };
    });
    return map;
  });

  const handleUpdate = useCallback((data: AvailabilityMap) => {
    setAvailability(data);
  }, []);

  return { availability, handleUpdate };
}
