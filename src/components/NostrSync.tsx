import { useEffect, useRef } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { DEFAULT_RELAYS, relaysFromRelayListEvent } from '@/lib/relays';

/**
 * NostrSync - keeps the client's relay set in step with the logged-in account.
 *
 * Runs globally. On login it reads the account's NIP-65 relay list (kind 10002)
 * and adopts it; the NostrProvider always adds the Gamestr relay on top of
 * whatever list comes back. When the account changes or logs out, the relay set
 * falls back to the app defaults, so one account's relays are never used for
 * another.
 */
export function NostrSync() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, updateConfig } = useAppContext();
  const userPubkey = user?.pubkey;

  // AppProvider recreates updateConfig on every render, so hold it in a ref to
  // keep this effect keyed on the account only.
  const updateConfigRef = useRef(updateConfig);
  updateConfigRef.current = updateConfig;

  // Owner of the current relay list, read fresh without widening the effect deps.
  const ownerRef = useRef(config.relayMetadata?.pubkey);
  ownerRef.current = config.relayMetadata?.pubkey;

  useEffect(() => {
    const resetToDefaults = () => {
      updateConfigRef.current((current) => {
        const metadata = current.relayMetadata;
        if (!metadata?.pubkey && metadata?.updatedAt === 0) return current;

        return {
          ...current,
          relayMetadata: { relays: DEFAULT_RELAYS, updatedAt: 0 },
        };
      });
    };

    if (!userPubkey) {
      // Logged out: restore the defaults if the current list belongs to an account.
      if (ownerRef.current) resetToDefaults();
      return;
    }

    // Switching accounts: drop the previous account's list while this one syncs.
    if (ownerRef.current && ownerRef.current !== userPubkey) resetToDefaults();

    let cancelled = false;

    const syncRelays = async () => {
      try {
        const [event] = await nostr.query(
          [{ kinds: [10002], authors: [userPubkey], limit: 1 }],
          { signal: AbortSignal.timeout(5000) },
        );

        if (!event || cancelled) return;

        const relays = relaysFromRelayListEvent(event);
        if (relays.length === 0) return;

        updateConfigRef.current((current) => {
          const metadata = current.relayMetadata;
          const sameOwner = metadata?.pubkey === userPubkey;
          const alreadyCurrent = sameOwner && event.created_at <= metadata.updatedAt;

          if (alreadyCurrent) return current;

          return {
            ...current,
            relayMetadata: {
              relays,
              updatedAt: event.created_at,
              pubkey: userPubkey,
            },
          };
        });
      } catch (error) {
        console.warn('Failed to sync relay list from Nostr:', error);
      }
    };

    syncRelays();

    return () => {
      cancelled = true;
    };
  }, [userPubkey, nostr]);

  return null;
}
