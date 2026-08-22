import { useCallback } from 'react';
import type { WebLNProvider } from '@webbtc/webln-types';
import { useNostr } from '@nostrify/react';
import { useNWC } from '@/hooks/useNWCContext';
import { useWallet } from '@/hooks/useWallet';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

export type ZapPaymentResult =
  /** A payment method confirmed the invoice (or the zap receipt was observed). */
  | 'paid'
  /** Payment wasn't confirmed (no wallet, dismissed window without paying,
   *  or an error with no receipt). The caller should fall back to the
   *  invoice/QR so the user can still pay. The invoice is single-use, so
   *  there is no double-pay risk. */
  | 'fallback';

/**
 * Resolve a usable WebLN provider at pay time. Hook state can be stale
 * (detected async, mounted earlier), so always re-check `window.webln`.
 */
async function resolveWebLnProvider(stateWebln: WebLNProvider | null): Promise<WebLNProvider | null> {
  let provider: WebLNProvider | null =
    (typeof window !== 'undefined' ? (window as { webln?: WebLNProvider }).webln : undefined) ??
    stateWebln ??
    null;

  if (!provider) return null;

  try {
    if (typeof provider.enable === 'function') {
      const enabled = (await provider.enable()) as WebLNProvider | undefined;
      if (enabled) provider = enabled;
    }
  } catch (error) {
    console.warn('[ZapPayment] WebLN enable did not resolve:', error);
    return null;
  }

  return typeof provider.sendPayment === 'function' ? provider : null;
}

type QueryFn = (
  filters: NostrFilter[],
  opts: { signal: AbortSignal },
) => Promise<NostrEvent[]>;

/**
 * Some WebLN wallets reject sendPayment even when the user completes the
 * payment in the wallet's own UI. The authoritative signal for a NIP-57
 * zap is its kind 9735 receipt on the relays, published by the LNURL
 * service once the invoice settles. Poll for it before giving up.
 */
async function waitForZapReceipt(
  query: QueryFn,
  recipientPubkey: string,
  zapRequestId: string,
  startedAt: number,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const filters: NostrFilter[] = [{
        kinds: [9735],
        '#p': [recipientPubkey],
        since: Math.max(0, startedAt - 120),
        limit: 200,
      }];
      const receipts = await query(filters, { signal: AbortSignal.timeout(2500) });

      const paid = receipts.some((receipt) => {
        const description = receipt.tags.find(([name]) => name === 'description')?.[1];
        return !!description && description.includes(zapRequestId);
      });
      if (paid) return true;
    } catch {
      // Relay hiccup or timeout — keep polling until the deadline.
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return false;
}

/**
 * The single payment cascade shared by every zap flow in the app.
 *
 * Order: NWC (if connected) -> WebLN (if registered) -> fallback.
 *
 * When `zapRequest` and `recipientPubkey` are supplied, a rejected
 * WebLN/NWC attempt waits for the kind 9735 zap receipt before declaring
 * failure — so successful payments made in the wallet UI never trigger
 * the QR fallback.
 *
 * Returns:
 * - 'paid':     confirmed by a payment method or by observing the receipt.
 * - 'fallback': payment wasn't confirmed. Show the invoice/QR.
 */
export function useZapPayment() {
  const { nostr } = useNostr();
  const { webln } = useWallet();
  const { sendPayment, getActiveConnection } = useNWC();

  const payInvoice = useCallback(
    async (
      invoice: string,
      opts?: { zapRequest?: NostrEvent; recipientPubkey?: string },
    ): Promise<ZapPaymentResult> => {
      // Receipt verification: poll the relays for the kind 9735 receipt
      // matching this zap request. A rejection that happens instantly
      // usually means the wallet refused outright (nothing to wait for),
      // while slower rejections mean a popup flow ran — give it real time.
      const verifyAfterReject = async (engagedAt: number): Promise<ZapPaymentResult> => {
        if (!opts?.recipientPubkey || !opts.zapRequest?.id) return 'fallback';

        const elapsed = Date.now() / 1000 - engagedAt;
        const timeoutMs = elapsed < 2 ? 3000 : 15000;
        const paid = await waitForZapReceipt(
          (filters, signalOpts) => nostr.query(filters, signalOpts),
          opts.recipientPubkey,
          opts.zapRequest.id,
          Math.floor(Date.now() / 1000),
          timeoutMs,
        );
        return paid ? 'paid' : 'fallback';
      };

      // 1. Nostr Wallet Connect
      const nwc = getActiveConnection();
      if (nwc?.connectionString && nwc.isConnected) {
        try {
          await sendPayment(nwc, invoice);
          return 'paid';
        } catch (error) {
          console.warn('[ZapPayment] NWC payment did not resolve:', error);
        }
      }

      // 2. WebLN wallet (re-resolved at call time)
      const engagedAt = Date.now() / 1000;
      const provider = await resolveWebLnProvider(webln);
      if (provider) {
        try {
          await provider.sendPayment(invoice);
          return 'paid';
        } catch (error) {
          console.warn('[ZapPayment] WebLN sendPayment did not resolve:', error);
          if (opts?.recipientPubkey && opts.zapRequest?.id) {
            return await verifyAfterReject(engagedAt);
          }
          return 'fallback';
        }
      }

      // 3. Nothing available — caller decides on manual fallback.
      return 'fallback';
    },
    [nostr, webln, sendPayment, getActiveConnection],
  );

  return { payInvoice };
}
