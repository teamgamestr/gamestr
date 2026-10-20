import { useCallback, useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { useAppContext } from '@/hooks/useAppContext';
import { GAMESTR_RELAY_URL, getScoreReadRelayUrls } from '@/lib/relays';
import { LEGACY_SCORE_RELAYS } from '@/lib/scoreRelays';
import { mergeNostrEvents } from '@/lib/nostrEvents';

export interface StagedQueryOptions {
  /** Caller's abort signal (TanStack's query signal), not a timeout one. */
  signal?: AbortSignal;
  /** Budget for each stage, in milliseconds. */
  timeoutMs?: number;
  /**
   * Called with the Gamestr relay's answer as soon as it arrives, before the
   * visitor's own relays have been asked. Use it to publish an early result to
   * the query cache so the first paint does not wait on their relays.
   */
  onPrimary?: (events: NostrEvent[]) => void;
}

/**
 * Query in two stages: Gamestr first, then the relays that hold the rest.
 *
 * Stage 1 asks the Gamestr relay alone, so leaderboards and game lists render
 * from Gamestr's answer without waiting for whatever relays the visitor added
 * to their NIP-65 list. Stage 2 asks the score mirrors, the legacy kind 5555
 * relays and the visitor's extra read relays, then merges their events in; a
 * slow or dead relay there can delay the refinement, never the first paint.
 */
export function useStagedRelayQuery() {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  // Stage two is every score read relay except Gamestr. The app's mirrors are
  // kept even when a NIP-65 list leaves them out, because most score events
  // exist on exactly one relay and Gamestr holds nearly all of them.
  const secondaryRelays = useMemo(() => {
    const urls = new Set([
      ...getScoreReadRelayUrls(config.relayMetadata.relays),
      ...LEGACY_SCORE_RELAYS,
    ]);
    urls.delete(GAMESTR_RELAY_URL);
    return [...urls];
  }, [config.relayMetadata.relays]);

  return useCallback(
    async (filters: NostrFilter[], options: StagedQueryOptions = {}): Promise<NostrEvent[]> => {
      const { signal, timeoutMs = 3000, onPrimary } = options;

      const stageSignal = () =>
        signal
          ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
          : AbortSignal.timeout(timeoutMs);

      let primary: NostrEvent[] = [];
      try {
        primary = await nostr.query(filters, {
          signal: stageSignal(),
          relays: [GAMESTR_RELAY_URL],
        });
      } catch (error) {
        // A cancelled query must stay cancelled; a slow Gamestr relay should
        // not stop the other relays from answering.
        if (signal?.aborted) throw error;
        console.warn('Gamestr query failed, falling back to the relay list', error);
      }

      if (primary.length > 0) {
        onPrimary?.(primary);
      }

      if (secondaryRelays.length === 0) {
        return primary;
      }

      try {
        const secondary = await nostr.query(filters, {
          signal: stageSignal(),
          relays: secondaryRelays,
        });
        return mergeNostrEvents(primary, secondary);
      } catch (error) {
        if (signal?.aborted) throw error;
        return primary;
      }
    },
    [nostr, secondaryRelays],
  );
}
