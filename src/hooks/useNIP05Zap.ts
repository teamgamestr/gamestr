import { useState, useCallback } from 'react';
import { nip57 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useZapPayment } from '@/hooks/useZapPayment';
import { useNIP05Config } from '@/hooks/useNIP05';
import type { WebLNProvider } from '@webbtc/webln-types';

export function useNIP05Zap(webln: WebLNProvider | null, orderId: string | null, amountMillisats: number) {
  const { user } = useCurrentUser();
  const { presetRelays } = useAppContext();
  const { toast } = useToast();
  const { payInvoice } = useZapPayment();
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
        const zapEndpoint = await nip57.getZapEndpoint(author.data.event);
        if (!zapEndpoint) {
          throw new Error('Could not find a zap endpoint for the service account');
        }

        const zapRequest = nip57.makeZapRequest({
          profile: servicePubkey,
          event: null,
          amount: amountMillisats,
          relays: presetRelays?.map((r) => r.url) ?? ['wss://relay.damus.io'],
          comment,
        });

        const signedZapRequest = await user.signer.signEvent(zapRequest);

        const res = await fetch(
          `${zapEndpoint}?amount=${amountMillisats}&nostr=${encodeURIComponent(JSON.stringify(signedZapRequest))}`,
        );
        const responseData = await res.json();

        if (!res.ok) {
          throw new Error(responseData.reason || `LNURL error (${res.status})`);
        }
        if (responseData.status === 'ERROR') {
          throw new Error(responseData.reason || 'LNURL service returned an error');
        }

        const newInvoice = responseData.pr;
        if (!newInvoice || typeof newInvoice !== 'string') {
          throw new Error('Lightning service did not return a valid invoice');
        }

        // Single shared payment cascade: NWC -> WebLN -> manual.
        const result = await payInvoice(newInvoice);

        if (result === 'paid') {
          toast({ title: 'Zap sent!', description: `You sent ${(amountMillisats / 1000).toLocaleString()} sats.` });
          setIsZapping(false);
          return true;
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
    [user, orderId, servicePubkey, author.data?.event, presetRelays, toast, payInvoice, amountMillisats],
  );

  return {
    zap,
    isZapping,
    invoice,
    setInvoice,
    reset,
  };
}
