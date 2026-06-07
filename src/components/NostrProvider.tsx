import React, { useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { presetRelays } = useAppContext();

  const pool = useRef<NPool | undefined>(undefined);
  const relaysRef = useRef<string[]>((presetRelays ?? []).map((r) => r.url));

  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        const map = new Map<string, typeof filters>();
        for (const url of relaysRef.current) {
          map.set(url, filters);
        }
        return map;
      },
      eventRouter(_event: NostrEvent) {
        return relaysRef.current;
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
