import React, { useEffect, useRef } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { getReadRelayUrls, getScoreReadRelayUrls, getWriteRelayUrls, isScoreFilter, relaySetKey } from '@/lib/relays';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Refs so routes always reflect the latest relay list. The helpers union in
  // the Gamestr relay, so it is used even when a NIP-65 list omits it.
  const relaysRef = useRef(config.relayMetadata.relays);
  const relayKeyRef = useRef(relaySetKey(config.relayMetadata.relays));

  // Pick up relay changes (login, logout, NIP-65 sync, manual edit) and refetch
  // anything already on screen from the new relay set.
  useEffect(() => {
    relaysRef.current = config.relayMetadata.relays;

    const key = relaySetKey(config.relayMetadata.relays);
    if (key !== relayKeyRef.current) {
      relayKeyRef.current = key;
      queryClient.invalidateQueries();
    }
  }, [config.relayMetadata.relays, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters: NostrFilter[]) {
        const routes = new Map<string, NostrFilter[]>();

        for (const url of getReadRelayUrls(relaysRef.current)) {
          routes.set(url, filters);
        }

        // Score reads do not depend on the visitor's list: most score events
        // exist on exactly one relay and the Gamestr relay holds almost all of
        // them, so the score mirrors stay in the fan-out even when a NIP-65
        // list leaves them out.
        const scoreFilters = filters.filter(isScoreFilter);
        if (scoreFilters.length > 0) {
          for (const url of getScoreReadRelayUrls(relaysRef.current)) {
            if (routes.has(url)) continue;
            routes.set(url, scoreFilters);
          }
        }

        return routes;
      },
      eventRouter(_event: NostrEvent) {
        return getWriteRelayUrls(relaysRef.current);
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;
