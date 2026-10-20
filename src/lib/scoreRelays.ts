import type { NostrFilter } from '@nostrify/nostrify';
import { GAMESTR_RELAY_URL } from '@/lib/relays';

/**
 * Relays a legacy kind 5555 score lookup is sent to.
 *
 * The Gamestr relay leads: the strfry router sweeps kind 5555 from the public
 * relays into it continuously, and its history was backfilled on 2026-10-20
 * (2,878 events reaching back to 2026-02-23), so it is the one place with the
 * whole corpus. The general relays stay in the list because that is where the
 * events are published, and because a lookup that depends on one relay has no
 * answer when that relay is unreachable.
 *
 * The list is fixed rather than taken from the visitor's relay list: a NIP-65
 * list without these relays otherwise reports no legacy history at all.
 */
export const LEGACY_SCORE_RELAYS = [
  GAMESTR_RELAY_URL,
  'wss://relay.ditto.pub',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

/** True when a filter is a legacy kind 5555 score lookup. */
export function isLegacyScoreFilter(filter: NostrFilter): boolean {
  return filter.kinds?.includes(5555) ?? false;
}
