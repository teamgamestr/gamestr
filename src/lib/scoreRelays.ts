import type { NostrFilter } from '@nostrify/nostrify';

/**
 * Relays that carry legacy kind 5555 score events.
 *
 * The Gamestr relay holds none: a `{"kinds":[5555]}` REQ against
 * wss://relay.gamestr.io answers with zero events, so the legacy history of the
 * kind-5555 games (word5, unicornvssnakes) exists only on the general relays.
 * Those reads are pinned here rather than depending on whatever relay list the
 * visitor happens to have, because a visitor whose NIP-65 list replaces the
 * defaults otherwise loses that history entirely.
 *
 * Measured 2026-10-20: ditto and nos.lol both return the full 500-event cap,
 * primal.net a few dozen, damus none.
 */
export const LEGACY_SCORE_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

/** True when a filter is a legacy kind 5555 score lookup. */
export function isLegacyScoreFilter(filter: NostrFilter): boolean {
  return filter.kinds?.includes(5555) ?? false;
}
