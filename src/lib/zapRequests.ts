/**
 * Building and verifying zap requests (NIP-57).
 *
 * Two things live here that the payment flow has to agree on with the
 * recipient's LNURL server: which event a zap is for, and what to do when the
 * invoice that comes back doesn't prove it was issued for our request.
 */

/** Minimal shape of the event being zapped. */
export interface ZapPointerSource {
  id: string;
  kind: number;
  pubkey: string;
  tags: string[][];
}

/** Tag identifying the event being zapped. */
export type ZapPointerTag = ['e', string] | ['a', string];

/** Addressable ("parameterized replaceable") event range, kinds 30000-39999. */
export function isAddressable(event: { kind: number }): boolean {
  return event.kind >= 30000 && event.kind < 40000;
}

/**
 * Build the pointer tag that says which event a zap is for, or `null` when
 * there is no event to point at (a zap at a person).
 *
 * NIP-57 lets a zap request identify its target with an `e` tag (event id) or
 * an `a` tag (addressable coordinate, `<kind>:<pubkey>:<d>`). Addressable
 * targets are the awkward case here: score events (kind 30762) use a
 * colon-laden `d` tag — `<game>:<player>:<timestamp>` — so a coordinate built
 * from one has more than the three colon-separated parts some zap servers
 * expect. wallet-of-satoshi's LNURL server is one of them: it discards the
 * whole zap request and answers with a plain LUD-06 invoice, whose description
 * hash commits to nothing we sent, so the zap dies as unverifiable.
 *
 * An event id identifies the same event, contains no colons, and is accepted
 * everywhere (NIP-57 Appendix D allows 0 or 1 `e` tags), so it is used
 * whenever a coordinate would be ambiguous.
 */
export function zapPointerTag(event: ZapPointerSource): ZapPointerTag | null {
  if (isAddressable(event)) {
    const identifier = event.tags.find(([name]) => name === 'd')?.[1] ?? '';
    if (identifier && !identifier.includes(':')) {
      return ['a', `${event.kind}:${event.pubkey}:${identifier}`];
    }
  }

  return event.id ? ['e', event.id] : null;
}

/**
 * Message for an invoice that commits to neither the zap request nor the
 * endpoint's LUD-06 metadata.
 *
 * Naming the service matters: the sender cannot fix this, and a provider that
 * mints plain LNURL invoices in answer to a zap request is visibly
 * misconfigured rather than unlucky. Known cases are primal.net's lnurlp
 * (whose description hash is fixed per address, so it cannot be a zap
 * invoice), breez.tips / Wisp wallets, and nostrich.org.
 */
export function unverifiableInvoiceMessage(callback: string): string {
  let host = callback;
  try {
    host = new URL(callback).host;
  } catch {
    // Not a URL — use it as-is.
  }

  return (
    `No payment was made: ${host} returned an invoice that does not commit to your ` +
    'zap request. That lightning service may not support zaps properly.'
  );
}
