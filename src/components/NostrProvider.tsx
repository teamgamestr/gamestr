import React, { useEffect, useRef } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { getReadRelayUrls, getWriteRelayUrls, relaySetKey } from '@/lib/relays';

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
