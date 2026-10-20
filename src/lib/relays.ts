import type { NostrEvent } from '@nostrify/nostrify';

/** A relay plus the direction(s) the visitor wants to use it in. */
export interface RelayEntry {
  url: string;
  read: boolean;
  write: boolean;
}

/**
 * The Gamestr relay. It is connected for reads and writes no matter what the
 * visitor's own relay list says, so Gamestr content (scores, games, profiles)
 * is always reachable and every score still lands somewhere the leaderboards
 * index.
 */
export const GAMESTR_RELAY_URL = 'wss://relay.gamestr.io';

export const GAMESTR_RELAY: RelayEntry = {
  url: GAMESTR_RELAY_URL,
  read: true,
  write: true,
};

/**
 * The testnet relay.
 *
 * It shipped as one of the defaults, so visitors who never edited their list
 * still read from it and publish to it - which puts testnet scores for live
 * games on the production leaderboards. It is no longer a default, and
 * `stripRetiredTestRelay` removes it from a stored default list. It stays a
 * usable URL (the developer page quotes it for game testing); it is just not
 * part of anyone's defaults.
 */
export const TESTNET_RELAY_URL = 'wss://test.gamestr.io';

/** Relays used until a visitor's NIP-65 relay list is known. */
export const DEFAULT_RELAYS: RelayEntry[] = [
  GAMESTR_RELAY,
  { url: 'wss://relay.ditto.pub', read: true, write: true },
  { url: 'wss://nos.lol', read: true, write: true },
  { url: 'wss://relay.damus.io', read: true, write: true },
  { url: 'wss://relay.primal.net', read: true, write: true },
];

/** Drop the retired testnet relay from a list that predates its removal. */
export function stripRetiredTestRelay(relays: RelayEntry[]): RelayEntry[] {
  return relays.filter((relay) => normalizeRelayUrl(relay.url) !== TESTNET_RELAY_URL);
}

/**
 * Canonical form of a relay URL: ws(s) scheme, no trailing slash, no fragment.
 * Returns null when the input is not a usable relay URL.
 */
export function normalizeRelayUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^wss?:\/\//i.test(trimmed) ? trimmed : `wss://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'wss:' && parsed.protocol !== 'ws:') return null;
    if (!parsed.hostname) return null;

    const path = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return null;
  }
}

/** Union of relay lists, deduplicated by canonical URL with read/write flags OR'd. */
export function mergeRelays(...lists: RelayEntry[][]): RelayEntry[] {
  const byUrl = new Map<string, RelayEntry>();

  for (const list of lists) {
    for (const relay of list) {
      const url = normalizeRelayUrl(relay.url);
      if (!url) continue;

      const existing = byUrl.get(url);
      if (existing) {
        existing.read = existing.read || relay.read;
        existing.write = existing.write || relay.write;
      } else {
        byUrl.set(url, { url, read: relay.read, write: relay.write });
      }
    }
  }

  return [...byUrl.values()];
}

/** The visitor's relays with the Gamestr relay guaranteed to be present. */
export function withGamestrRelay(relays: RelayEntry[]): RelayEntry[] {
  return mergeRelays([GAMESTR_RELAY], relays);
}

/** Relays to query: Gamestr plus the visitor's read relays. */
export function getReadRelayUrls(relays: RelayEntry[]): string[] {
  return withGamestrRelay(relays)
    .filter((relay) => relay.read)
    .map((relay) => relay.url);
}

/** Relays to publish to: Gamestr plus the visitor's write relays. */
export function getWriteRelayUrls(relays: RelayEntry[]): string[] {
  return withGamestrRelay(relays)
    .filter((relay) => relay.write)
    .map((relay) => relay.url);
}

/** Parse a kind 10002 relay list event into relay entries. */
export function relaysFromRelayListEvent(event: NostrEvent): RelayEntry[] {
  if (event.kind !== 10002) return [];

  const relays: RelayEntry[] = [];

  for (const [name, rawUrl, marker] of event.tags) {
    if (name !== 'r' || !rawUrl) continue;

    const url = normalizeRelayUrl(rawUrl);
    if (!url) continue;

    relays.push({
      url,
      read: marker !== 'write',
      write: marker !== 'read',
    });
  }

  return mergeRelays(relays);
}

/** Build the `r` tags for a kind 10002 event. */
export function relayListTags(relays: RelayEntry[]): string[][] {
  return mergeRelays(relays)
    .filter((relay) => relay.read || relay.write)
    .map((relay) => {
      if (relay.read && relay.write) return ['r', relay.url];
      return ['r', relay.url, relay.read ? 'read' : 'write'];
    });
}

/** Stable signature of a relay set, for change detection. */
export function relaySetKey(relays: RelayEntry[]): string {
  return relays
    .map((relay) => `${relay.url}:${relay.read ? 'r' : ''}${relay.write ? 'w' : ''}`)
    .sort()
    .join(',');
}
