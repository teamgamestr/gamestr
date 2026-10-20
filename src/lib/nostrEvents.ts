import { NSet } from '@nostrify/nostrify';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Merge event lists from several relays into one list.
 *
 * Identical events collapse to one, and for replaceable / addressable kinds the
 * newest version wins regardless of which relay served it (NSet keeps the
 * per-key latest), so a late answer from a stale relay cannot roll back newer
 * data.
 */
export function mergeNostrEvents(...lists: NostrEvent[][]): NostrEvent[] {
  const events = new NSet();

  for (const list of lists) {
    for (const event of list) {
      events.add(event);
    }
  }

  return [...events];
}
