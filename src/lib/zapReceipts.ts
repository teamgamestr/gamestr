/**
 * Waiting for the zap receipt that settles a payment.
 *
 * A wallet's `sendPayment` resolving says the wallet sent *something*; it does
 * not say the recipient's zap server credited it. A wallet's failure says even
 * less: a timeout or a dismissed prompt can still settle. The kind 9735 zap
 * receipt is the only evidence either way, and it echoes the invoice we were
 * handed — so matching on the invoice answers both questions, and lets the
 * client report what happened instead of guessing.
 *
 * A receipt is not proof of payment (NIP-57 says so itself); it is the
 * recipient's own zap server asserting it. That is exactly the claim the UI
 * should be making, which is why the wording below is "confirmed by the
 * recipient's zap server" rather than "paid".
 */
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import type { ZapPointerTag } from '@/lib/zapRequests';

/** How long to keep looking for the receipt before reporting it unconfirmed. */
export const RECEIPT_WAIT_MS = 20_000;

/** Gap between polls. Receipts normally land within a few seconds. */
const POLL_INTERVAL_MS = 2_500;

/** Cap on a single relay query, so one slow relay cannot eat the whole wait. */
const QUERY_TIMEOUT_MS = 5_000;

/** Query function, as provided by `useNostr()`. */
export type NostrQuery = (
  filters: NostrFilter[],
  opts: { signal: AbortSignal },
) => Promise<NostrEvent[]>;

/** Normalise a BOLT11 string for comparison (`lightning:` prefix, case). */
export function normalizeInvoice(invoice: string): string {
  return invoice.trim().replace(/^lightning:/i, '').toLowerCase();
}

/** Whether a receipt is the one for exactly this invoice. */
export function receiptPaysInvoice(receipt: NostrEvent, invoice: string): boolean {
  const bolt11 = receipt.tags.find(([name]) => name === 'bolt11')?.[1];
  return !!bolt11 && normalizeInvoice(bolt11) === normalizeInvoice(invoice);
}

export interface ZapReceiptWaitOptions {
  query: NostrQuery;
  /** The invoice the wallet was asked to pay. */
  invoice: string;
  /** Zap recipient — every receipt carries this as its `p` tag. */
  recipientPubkey: string;
  /** Pubkey the recipient's LNURL server signs receipts with (NIP-57 App. C). */
  nostrPubkey?: string;
  /** Tag the zap request pointed at, to widen the search beyond `#p`. */
  pointer?: ZapPointerTag | null;
  timeoutMs?: number;
}

/**
 * Poll the relays for the receipt for `invoice`, up to `timeoutMs`.
 *
 * Returns the receipt, or `null` when none appeared in time. A receipt that
 * matches the invoice but was signed by a key other than the advertised
 * `nostrPubkey` is not accepted — NIP-57 Appendix F requires that key — but is
 * reported to the console, since it means the recipient's server is
 * misbehaving rather than the payment failing.
 */
export async function waitForZapReceipt(opts: ZapReceiptWaitOptions): Promise<NostrEvent | null> {
  const deadline = Date.now() + (opts.timeoutMs ?? RECEIPT_WAIT_MS);
  // Generous, because a receipt's `created_at` is only a SHOULD (it is meant to
  // be the payment time). The invoice match, not the window, is what makes a
  // candidate correct.
  const since = Math.floor(Date.now() / 1000) - 900;

  const filters: NostrFilter[] = [
    { kinds: [9735], '#p': [opts.recipientPubkey], since, limit: 100 },
  ];
  if (opts.pointer) {
    filters.push({
      kinds: [9735],
      [`#${opts.pointer[0]}`]: [opts.pointer[1]],
      since,
      limit: 100,
    } as NostrFilter);
  }

  while (Date.now() < deadline) {
    try {
      const receipts = await opts.query(filters, {
        signal: AbortSignal.timeout(Math.min(QUERY_TIMEOUT_MS, deadline - Date.now())),
      });

      const match = receipts.find((receipt) => receiptPaysInvoice(receipt, opts.invoice));
      if (match) {
        if (!opts.nostrPubkey || match.pubkey === opts.nostrPubkey) {
          return match;
        }
        console.warn(
          `Zap receipt ${match.id} pays our invoice but was signed by ${match.pubkey}, ` +
          `not the advertised zap server ${opts.nostrPubkey}`,
        );
      }
    } catch (error) {
      console.warn('Zap receipt lookup failed:', error);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return null;
}
