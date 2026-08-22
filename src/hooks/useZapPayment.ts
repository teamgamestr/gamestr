import { useCallback } from 'react';
import type { WebLNProvider } from '@webbtc/webln-types';
import { useNWC } from '@/hooks/useNWCContext';
import { useWallet } from '@/hooks/useWallet';

export type ZapPaymentResult =
  /** A payment method confirmed the invoice. */
  | 'paid'
  /** No payment method is available; caller should show the QR/invoice. */
  | 'no-wallet'
  /** A wallet was engaged but never confirmed through its API. The caller should NOT assume failure (the wallet's own UI may have handled it) and must not double-prompt. */
  | 'unconfirmed';

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
 * Order: NWC (if connected) -> WebLN (if registered).
 *
 * Returns one of:
 * - 'paid':        an automatic method confirmed payment.
 * - 'no-wallet':   no NWC connection and no WebLN wallet. The caller
 *                  should fall back to showing the invoice/QR.
 * - 'unconfirmed': a wallet was engaged but its API didn't confirm.
 *                  The wallet's own UI may still complete the payment,
 *                  so callers must not show the QR (double-pay risk) or
 *                  report a hard failure.
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
          console.warn('[ZapPayment] WebLN sendPayment did not resolve:', error);
          return 'unconfirmed';
        }
      }

      // 3. Nothing available — caller decides on manual fallback.
      return 'no-wallet';
    },
    [webln, sendPayment, getActiveConnection],
  );

  return { payInvoice };
}
