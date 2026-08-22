import { useCallback } from 'react';
import type { WebLNProvider } from '@webbtc/webln-types';
import { useNWC } from '@/hooks/useNWCContext';
import { useWallet } from '@/hooks/useWallet';

export type ZapPaymentResult =
  /** A payment method confirmed the invoice. */
  | 'paid'
  /** Payment wasn't confirmed (no wallet, dismissed window, or error).
   *  The caller should fall back to the invoice/QR so the user can still
   *  pay. The invoice is single-use, so there is no double-pay risk. */
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

/**
 * The single payment cascade shared by every zap flow in the app.
 *
 * Order: NWC (if connected) -> WebLN (if registered) -> fallback.
 *
 * Returns:
 * - 'paid':     an automatic method confirmed the payment.
 * - 'fallback': payment wasn't confirmed (no wallet registered, the
 *               wallet window was dismissed without paying, or the
 *               wallet errored). Show the invoice/QR.
 */
export function useZapPayment() {
  const { webln } = useWallet();
  const { sendPayment, getActiveConnection } = useNWC();

  const payInvoice = useCallback(
    async (invoice: string): Promise<ZapPaymentResult> => {
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
      const provider = await resolveWebLnProvider(webln);
      if (provider) {
        try {
          await provider.sendPayment(invoice);
          return 'paid';
        } catch (error) {
          // Rejection here means the wallet window was dismissed without
          // paying (or the wallet errored) — fall back to the QR.
          console.warn('[ZapPayment] WebLN sendPayment did not resolve:', error);
        }
        return 'fallback';
      }

      // 3. Nothing available — caller decides on manual fallback.
      return 'fallback';
    },
    [webln, sendPayment, getActiveConnection],
  );

  return { payInvoice };
}
