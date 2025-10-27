import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useAuthor(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: ['author', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return {};
      }

      // Check if this is a test player first
      const { getTestPlayerMetadata } = await import('@/lib/testData');
      const testMetadata = getTestPlayerMetadata(pubkey);
      
      if (testMetadata) {
        try {
          const metadata = n.json().pipe(n.metadata()).parse(testMetadata.content);
          return { metadata, event: testMetadata };
        } catch {
          return { event: testMetadata };
        }
      }

      // Otherwise query from relay
      try {
        const [event] = await nostr.query(
          [{ kinds: [0], authors: [pubkey!], limit: 1 }],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]) },
        );

        if (!event) {
          throw new Error('No event found');
        }

        try {
          const metadata = n.json().pipe(n.metadata()).parse(event.content);
          return { metadata, event };
        } catch {
          return { event };
        }
      } catch (error) {
        // If relay query fails, return empty (don't throw)
        return {};
      }
    },
    staleTime: 5 * 60 * 1000, // Keep cached data fresh for 5 minutes
    retry: 1, // Reduce retries since we have test data fallback
  });
}
