import { nip19 } from 'nostr-tools';

const HEX64 = /^[0-9a-f]{64}$/i;

/**
 * Nostr links in this app carry bech32, not hex.
 *
 * Hex pubkeys and event ids are what relays speak, but they are unreadable in a
 * URL, they get truncated by every chat client that unfurls them, and NIP-19
 * exists precisely so identifiers can be shared. Every internal link therefore
 * goes through these helpers.
 *
 * They never throw: a value that is already bech32 (or is not hex at all) is
 * returned as-is, so a caller can pass a tag value that might be either.
 */

/** `/npub1…` for a hex pubkey, or `/player/<value>` if it is not hex. */
export function profilePath(pubkey: string | undefined): string {
  if (!pubkey) return '/';
  if (!HEX64.test(pubkey)) return `/player/${pubkey}`;

  try {
    return `/${nip19.npubEncode(pubkey)}`;
  } catch {
    return `/player/${pubkey}`;
  }
}

/**
 * `/player/npub1…` — the player view, which carries scores and notes. This is
 * the one to link for a player; `/<npub>` renders a profile card only.
 */
export function playerPath(pubkey: string | undefined): string {
  const npub = encodeNpub(pubkey);
  return npub ? `/player/${npub}` : '/';
}

/** A bare `npub1…` for a hex pubkey, or the value unchanged. */
export function encodeNpub(pubkey: string | undefined): string {
  if (!pubkey || !HEX64.test(pubkey)) return pubkey ?? '';

  try {
    return nip19.npubEncode(pubkey);
  } catch {
    return pubkey;
  }
}

/**
 * `nevent1…` for an event id. Addressable events (30000-39999) are better
 * shared as `naddr`, so callers that hold the whole event should prefer
 * `eventPointer` below.
 */
export function encodeNevent(id: string | undefined): string {
  if (!id || !HEX64.test(id)) return id ?? '';

  try {
    return nip19.neventEncode({ id });
  } catch {
    return id;
  }
}

/** `naddr1…` for an addressable event, `nevent1…` for everything else. */
export function eventPointer(event: {
  id: string;
  kind: number;
  pubkey: string;
  tags: string[][];
}): string {
  if (event.kind >= 30000 && event.kind < 40000) {
    const identifier = event.tags.find(([name]) => name === 'd')?.[1] ?? '';

    try {
      return nip19.naddrEncode({
        kind: event.kind,
        pubkey: event.pubkey,
        identifier,
      });
    } catch {
      // Fall through to the event id.
    }
  }

  return encodeNevent(event.id);
}

/**
 * Resolve a route parameter that may be a NIP-19 identifier or raw hex into the
 * hex form the relays need. Returns null when it is neither, so a page can show
 * its not-found state instead of querying a nonsense author.
 */
export function resolvePubkey(value: string | undefined): string | null {
  if (!value) return null;
  if (HEX64.test(value)) return value.toLowerCase();

  try {
    const decoded = nip19.decode(value);
    if (decoded.type === 'npub') return decoded.data;
    if (decoded.type === 'nprofile') return decoded.data.pubkey;
  } catch {
    // Not a NIP-19 identifier.
  }

  return null;
}

/** Resolve a route parameter that may be `note1…`, `nevent1…` or raw hex. */
export function resolveEventId(value: string | undefined): string | null {
  if (!value) return null;
  if (HEX64.test(value)) return value.toLowerCase();

  try {
    const decoded = nip19.decode(value);
    if (decoded.type === 'note') return decoded.data;
    if (decoded.type === 'nevent') return decoded.data.id;
  } catch {
    // Not a NIP-19 identifier.
  }

  return null;
}
