import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface FeaturedPlacement {
  gameKey: string;
  months: number;
  expiresAt: number;
}

/**
 * Fetch paid featured placements activated by the backend zap monitor.
 * Returns a map of game key ("pubkey:identifier") to placement info.
 */
export function useFeaturedPlacements() {
  const query = useQuery<FeaturedPlacement[], Error>({
    queryKey: ['featured-placements'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const res = await fetch('/api/featured/placements', { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.placements ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const placements = useMemo(() => {
    const map = new Map<string, FeaturedPlacement>();
    for (const placement of query.data ?? []) {
      map.set(placement.gameKey, placement);
    }
    return map;
  }, [query.data]);

  return { placements, ...query };
}
