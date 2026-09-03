import { useState, useCallback } from 'react';
import { nip57 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useNWC } from '@/hooks/useNWCContext';
import { assertInvoiceAmount, invoiceCommitsTo } from '@/lib/bolt11';
import { resolveLnurlPay } from '@/lib/lnurlPay';
import { useNIP05Config } from '@/hooks/useNIP05';
import type { WebLNProvider } from '@webbtc/webln-types';

export function useNIP05Zap(webln: WebLNProvider | null, orderId: string | null, amountMillisats: number) {
  const { user } = useCurrentUser();
  const { presetRelays } = useAppContext();
  const { toast } = useToast();
  const { sendPayment, getActiveConnection } = useNWC();
  const { data: config } = useNIP05Config();
  const servicePubkey = config?.servicePubkey ?? '';
  const author = useAuthor(servicePubkey);

  const [isZapping, setIsZapping] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsZapping(false);
    setInvoice(null);
  }, []);

  const zap = useCallback(
    async (comment: string) => {
      if (!user) {
        toast({ title: 'Login required', description: 'You must be logged in to send a zap.', variant: 'destructive' });
        return false;
      }
      if (!orderId) {
        toast({ title: 'No order', description: 'Create an order first.', variant: 'destructive' });
        return false;
      }
      if (!servicePubkey) {
        toast({ title: 'Service unavailable', description: 'NIP-05 service is not configured.', variant: 'destructive' });
        return false;
      }
      if (!author.data?.event) {
        toast({ title: 'Service not found', description: 'Could not load the Gamestr payment profile.', variant: 'destructive' });
        return false;
      }

      setIsZapping(true);
      setInvoice(null);

      try {
        const { lud06, lud16 } = author.data.metadata ?? {};
        let lnurlParams;
        try {
          lnurlParams = await resolveLnurlPay({ lud06, lud16 });
        } catch (endpointError) {
          throw new Error(
            endpointError instanceof Error
              ? endpointError.message
              : 'Could not find a zap endpoint for the service account',
          );
        }
        if (!lnurlParams.allowsNostr || !lnurlParams.nostrPubkey) {
          throw new Error("The payment profile's lightning address does not support zaps");
        }

        const zapRequest = nip57.makeZapRequest({
          profile: servicePubkey,
          event: null,
          amount: amountMillisats,
          relays: presetRelays?.map((r) => r.url) ?? ['wss://nos.lol'],
          comment,
        });

        if (amountMillisats < lnurlParams.minSendable || amountMillisats > lnurlParams.maxSendable) {
          throw new Error(
            `This lightning address accepts between ${Math.ceil(lnurlParams.minSendable / 1000)} and ` +
              `${Math.floor(lnurlParams.maxSendable / 1000)} sats.`,
          );
        }

        const signedZapRequest = await user.signer.signEvent(zapRequest);
        const zapRequestJson = JSON.stringify(signedZapRequest);

        // Build the query with URLSearchParams: `encodeURI` leaves `&`, `+`
        // and `#` alone, so a comment containing any of them corrupted the
        // request.
        const zapUrl = new URL(lnurlParams.callback);
        zapUrl.searchParams.set('amount', String(amountMillisats));
        zapUrl.searchParams.set('nostr', zapRequestJson);

        const res = await fetch(zapUrl.toString());
        const responseData = await res.json();

        if (!res.ok) {
          throw new Error(responseData.reason || `LNURL error (${res.status})`);
        }

        const newInvoice = responseData.pr;
        if (!newInvoice || typeof newInvoice !== 'string') {
          throw new Error('Lightning service did not return a valid invoice');
        }

        const decodedInvoice = assertInvoiceAmount(newInvoice, amountMillisats);
        if (!invoiceCommitsTo(decodedInvoice, [zapRequestJson, lnurlParams.metadata])) {
          throw new Error('Lightning service returned an invoice for a different request. Payment cancelled.');
        }

        // Inline payment cascade: NWC -> WebLN -> manual fallback.
        const currentNWCConnection = getActiveConnection();
        if (currentNWCConnection?.connectionString && currentNWCConnection.isConnected) {
          try {
            await sendPayment(currentNWCConnection, newInvoice);
            toast({ title: 'Zap sent!', description: `You sent ${(amountMillisats / 1000).toLocaleString()} sats via NWC.` });
            setIsZapping(false);
            return true;
          } catch (nwcError) {
            console.error('NWC payment failed, falling back:', nwcError);
            toast({
              title: 'NWC payment failed',
              description: `${nwcError instanceof Error ? nwcError.message : 'Unknown NWC error'}. Falling back to other payment methods...`,
              variant: 'destructive',
            });
          }
        }

        if (webln) {
          try {
            let webLnProvider = webln;
            if (webln.enable && typeof webln.enable === 'function') {
              const enabledProvider = await webln.enable();
              const provider = enabledProvider as WebLNProvider | undefined;
              if (provider) webLnProvider = provider;
            }
            await webLnProvider.sendPayment(newInvoice);
            toast({ title: 'Zap sent!', description: `You sent ${(amountMillisats / 1000).toLocaleString()} sats.` });
            setIsZapping(false);
            return true;
          } catch (weblnError) {
            console.error('WebLN payment failed, falling back:', weblnError);
            toast({
              title: 'WebLN payment failed',
              description: `${weblnError instanceof Error ? weblnError.message : 'Unknown WebLN error'}. Falling back to other payment methods...`,
              variant: 'destructive',
            });
          }
        }

        // Payment not confirmed - show QR code and manual Lightning URI
        setInvoice(newInvoice);
        setIsZapping(false);
        return false;
      } catch (error) {
        console.error('NIP-05 zap error:', error);
        toast({
          title: 'Zap failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
        setIsZapping(false);
        return false;
      }
    },
    [user, orderId, servicePubkey, author.data?.event, presetRelays, toast, sendPayment, getActiveConnection, webln, amountMillisats],
  );

  return {
    zap,
    isZapping,
    invoice,
    setInvoice,
    reset,
  };
}
