import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useNWC } from '@/hooks/useNWCContext';
import type { NWCConnection } from '@/hooks/useNWC';
import { nip57 } from 'nostr-tools';
import type { Event } from 'nostr-tools';
import type { WebLNProvider } from '@webbtc/webln-types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { assertInvoiceAmount, invoiceCommitsTo } from '@/lib/bolt11';
import { resolveLnurlPay, type LnurlPayParams, type LnurlSource } from '@/lib/lnurlPay';
import {
  isAddressable,
  zapPointerTag,
  type ZapPointerTag,
} from '@/lib/zapRequests';
import { waitForZapReceipt } from '@/lib/zapReceipts';
import { getWriteRelayUrls } from '@/lib/relays';
import { WebLnUnavailableError, resolveWebLnProvider } from '@/lib/webln';

export function useZaps(
  target: Event | Event[],
  webln: WebLNProvider | null,
  _nwcConnection: NWCConnection | null,
  onZapSuccess?: () => void,
  /** Payment pointer to fall back on when the target's profile has none (or has not loaded). */
  fallbackLightningAddress?: string
) {
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  // Handle the case where an empty array is passed (from ZapButton when external data is provided)
  const actualTarget = Array.isArray(target) ? (target.length > 0 ? target[0] : null) : target;

  const author = useAuthor(actualTarget?.pubkey);
  const { sendPayment, getActiveConnection } = useNWC();
  const [isZapping, setIsZapping] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  /**
   * Set when the recipient's lightning service answered our zap request with an
   * invoice it cannot have minted for it. Such an invoice is not paid
   * automatically: it still sends the sats to the recipient, but as a plain tip
   * with no zap receipt behind it, and that is a choice for the payer to make.
   */
  const [plainTip, setPlainTip] = useState<{ host: string; sats: number } | null>(null);

  // Cleanup state when component unmounts
  useEffect(() => {
    return () => {
      setIsZapping(false);
      setIsConfirming(false);
      setInvoice(null);
      setPlainTip(null);
    };
  }, []);

  const { data: zapEvents, ...query } = useQuery<NostrEvent[], Error>({
    queryKey: ['nostr', 'zaps', actualTarget?.id],
    staleTime: 30000, // 30 seconds
    refetchInterval: (query) => {
      // Only refetch if the query is currently being observed (component is mounted)
      return query.getObserversCount() > 0 ? 60000 : false;
    },
    queryFn: async () => {
      if (!actualTarget) return [];

      const signal = AbortSignal.timeout(5000);

      // Query for zap receipts for this specific event
      if (isAddressable(actualTarget)) {
        // Addressable event. Our own zap requests point at the score's event
        // id rather than its coordinate (see `zapPointerTag`), while receipts
        // written by other clients point at the address, so ask for both in a
        // single request and dedupe.
        const identifier = actualTarget.tags.find((t) => t[0] === 'd')?.[1] || '';
        const events = await nostr.query([
          {
            kinds: [9735],
            '#e': [actualTarget.id],
          },
          {
            kinds: [9735],
            '#a': [`${actualTarget.kind}:${actualTarget.pubkey}:${identifier}`],
          },
        ], { signal });
        // A receipt carrying both an `e` and an `a` tag matches both filters.
        return [...new Map(events.map((event) => [event.id, event])).values()];
      } else {
        // Regular event
        const events = await nostr.query([{
          kinds: [9735],
          '#e': [actualTarget.id],
        }], { signal });
        return events;
      }
    },
    enabled: !!actualTarget?.id,
  });

  // Process zap events into simple counts and totals
  const { zapCount, totalSats, zaps } = useMemo(() => {
    if (!zapEvents || !Array.isArray(zapEvents) || !actualTarget) {
      return { zapCount: 0, totalSats: 0, zaps: [] };
    }

    let count = 0;
    let sats = 0;

    zapEvents.forEach(zap => {
      count++;

      // Try multiple methods to extract the amount:

      // Method 1: amount tag (from zap request, sometimes copied to receipt)
      const amountTag = zap.tags.find(([name]) => name === 'amount')?.[1];
      if (amountTag) {
        const millisats = parseInt(amountTag);
        sats += Math.floor(millisats / 1000);
        return;
      }

      // Method 2: Extract from bolt11 invoice
      const bolt11Tag = zap.tags.find(([name]) => name === 'bolt11')?.[1];
      if (bolt11Tag) {
        try {
          const invoiceSats = nip57.getSatoshisAmountFromBolt11(bolt11Tag);
          sats += invoiceSats;
          return;
        } catch (error) {
          console.warn('Failed to parse bolt11 amount:', error);
        }
      }

      // Method 3: Parse from description (zap request JSON)
      const descriptionTag = zap.tags.find(([name]) => name === 'description')?.[1];
      if (descriptionTag) {
        try {
          const zapRequest = JSON.parse(descriptionTag);
          const requestAmountTag = zapRequest.tags?.find(([name]: string[]) => name === 'amount')?.[1];
          if (requestAmountTag) {
            const millisats = parseInt(requestAmountTag);
            sats += Math.floor(millisats / 1000);
            return;
          }
        } catch (error) {
          console.warn('Failed to parse description JSON:', error);
        }
      }

      console.warn('Could not extract amount from zap receipt:', zap.id);
    });


    return { zapCount: count, totalSats: sats, zaps: zapEvents };
  }, [zapEvents, actualTarget]);

  /**
   * Pay an invoice through the wallet cascade, then wait for the receipt that
   * says the payment actually became a zap.
   *
   * The cascade is NWC, then WebLN, then (for the caller) the QR code. A wallet
   * that resolves is believed only as far as "something was sent": what the
   * payer needs to know is whether the recipient's zap server published a
   * receipt for this invoice, so that is what decides success. A wallet that
   * rejects is not treated as a failure either — the same wait runs, and a
   * receipt that arrives settles it in the payer's favour.
   */
  const payInvoice = async (
    invoiceToPay: string,
    sats: number,
    options: {
      /** Whether a request-bound receipt can exist for this invoice. */
      attestable: boolean;
      nostrPubkey?: string;
      pointer?: ZapPointerTag | null;
    },
  ) => {
    let walletError = '';
    let walletPaid = false;
    /** True once a wallet has actually been asked to pay, whatever it answered. */
    let walletAttempted = false;
    /** A capability failure: nothing was asked to pay, so nothing can be "unconfirmed". */
    let walletUnavailable: string | null = null;

    const currentNWCConnection = getActiveConnection();
    if (currentNWCConnection && currentNWCConnection.connectionString && currentNWCConnection.isConnected) {
      try {
        walletAttempted = true;
        await sendPayment(currentNWCConnection, invoiceToPay);
        walletPaid = true;
      } catch (nwcError) {
        console.error('NWC payment did not confirm:', nwcError);
        walletError = nwcError instanceof Error ? nwcError.message : 'Unknown NWC error';
      }
    }

    if (!walletPaid && webln) {
      try {
        // `enable()` may hand back the provider, or `void`, or `true` — only an
        // object that can actually pay is used (see `@/lib/webln`), so a
        // provider that cannot pay reports that instead of throwing
        // "sendPayment is not a function" from minified code.
        const provider = await resolveWebLnProvider(webln);
        walletAttempted = true;
        await provider.sendPayment(invoiceToPay);
        walletPaid = true;
        walletError = '';
      } catch (weblnError) {
        console.error('WebLN payment did not confirm:', weblnError);
        if (weblnError instanceof WebLnUnavailableError) {
          walletUnavailable = weblnError.message;
        } else {
          walletError = weblnError instanceof Error ? weblnError.message : 'Unknown WebLN error';
        }
      }
    }

    // An invoice the recipient's service did not bind to our request cannot
    // produce a receipt for it, so there is nothing to wait for: report the
    // payment as sent and stop short of calling it a zap.
    if (walletPaid && !options.attestable) {
      setIsZapping(false);
      setInvoice(null);
      toast({
        title: 'Tip sent',
        description: `You sent ${sats} sats. This lightning service does not issue zap receipts, so it will not count as a zap.`,
      });
      onZapSuccess?.();
      return;
    }

    // Wait for the receipt whenever one can exist, whoever reported what.
    if (options.attestable) {
      setIsConfirming(true);
      const receipt = await waitForZapReceipt({
        query: (filters, opts) => nostr.query(filters, opts),
        invoice: invoiceToPay,
        recipientPubkey: actualTarget!.pubkey,
        nostrPubkey: options.nostrPubkey,
        pointer: options.pointer,
      });
      setIsConfirming(false);

      if (receipt) {
        setIsZapping(false);
        setInvoice(null);
        toast({
          title: walletPaid ? 'Zap confirmed' : 'Zap confirmed after all',
          description: `The recipient's zap server confirmed ${sats} sats.`,
        });
        queryClient.invalidateQueries({ queryKey: ['nostr', 'zaps'] });
        onZapSuccess?.();
        return;
      }
    }

    if (walletPaid) {
      // The wallet says it paid, but the recipient's zap server has yet to say
      // the same. The payment is not lost — say so instead of claiming either
      // outcome, and keep the invoice reachable in case it did not go through.
      toast({
        title: 'Payment sent, not confirmed',
        description:
          `Your wallet paid ${sats} sats, but the recipient's zap server has not published a ` +
          'receipt for it yet. Check the zap count before paying again — the invoice below is ' +
          'only needed if it did not go through.',
        variant: 'destructive',
      });

      setInvoice(invoiceToPay);
      setIsZapping(false);
      return;
    }

    if (walletError && walletAttempted) {
      // The wallet's own UI may have completed (or still be completing) the
      // payment even though the API call did not resolve, so this says "could
      // not confirm" rather than "failed" — and tells the payer to check before
      // paying a second time.
      toast({
        title: 'Payment not confirmed',
        description:
          `${walletError}. Check your wallet before paying again — the invoice below is only ` +
          'needed if it did not go through.',
        variant: 'destructive',
      });
    } else if (walletUnavailable) {
      // Nothing was asked to pay, so this is not an unconfirmed payment: the
      // provider in this browser simply cannot pay, and the payer needs to know
      // which wallet to try instead.
      toast({
        title: 'WebLN provider cannot pay',
        description: walletUnavailable,
        variant: 'destructive',
      });
    }

    // Nothing left to try automatically: hand the invoice over for QR, copy or
    // a wallet of the payer's choosing.
    setInvoice(invoiceToPay);
    setIsZapping(false);
  };

  const zap = async (amount: number, comment: string) => {
    if (amount <= 0) {
      return;
    }

    setIsZapping(true);
    setInvoice(null); // Clear any previous invoice at the start
    setPlainTip(null);
    setIsConfirming(false);

    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to send a zap.',
        variant: 'destructive',
      });
      setIsZapping(false);
      return;
    }

    if (!actualTarget) {
      toast({
        title: 'Event not found',
        description: 'Could not find the event to zap.',
        variant: 'destructive',
      });
      setIsZapping(false);
      return;
    }

    try {
      // Candidate payment pointers: the target's own profile first, then the
      // caller's fallback address. The fallback matters for the Gamestr account,
      // whose static address keeps the featured-placement flow working when the
      // profile has not loaded yet or carries no lightning address.
      const sources: LnurlSource[] = [];
      const { lud06, lud16 } = author.data?.metadata ?? {};
      if (lud06 || lud16) {
        sources.push({ lud06, lud16 });
      }
      if (fallbackLightningAddress) {
        sources.push({ lud16: fallbackLightningAddress });
      }

      if (sources.length === 0) {
        toast({
          title: 'Lightning address not found',
          description: 'The author does not have a lightning address configured.',
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      // Resolve the recipient's LNURL-pay endpoint. `nip57.getZapEndpoint`
      // returns only the callback URL and discards the `minSendable` /
      // `maxSendable` bounds and the `metadata` string needed to check that
      // the invoice we get back is the one we asked for.
      let lnurlParams: LnurlPayParams | null = null;
      let endpointError: unknown = null;
      for (const source of sources) {
        try {
          lnurlParams = await resolveLnurlPay(source);
          break;
        } catch (error) {
          endpointError = error;
        }
      }

      if (!lnurlParams) {
        toast({
          title: 'Zap endpoint not found',
          description: endpointError instanceof Error
            ? endpointError.message
            : 'Could not find a zap endpoint for the author.',
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      if (!lnurlParams.allowsNostr || !lnurlParams.nostrPubkey) {
        toast({
          title: 'Zaps not supported',
          description: "This author's lightning address does not support zaps.",
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      const zapAmount = amount * 1000; // convert to millisats

      // The endpoint advertises what it will accept; asking for anything
      // outside that range can only produce an invoice we'd have to reject.
      if (zapAmount < lnurlParams.minSendable || zapAmount > lnurlParams.maxSendable) {
        toast({
          title: 'Amount out of range',
          description:
            `This lightning address accepts between ${Math.ceil(lnurlParams.minSendable / 1000)} and ` +
            `${Math.floor(lnurlParams.maxSendable / 1000)} sats.`,
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      // Anchor the zap request to the event being zapped. `makeZapRequest`
      // only knows how to build an `e` pointer from a bare id and an `a`
      // pointer from a whole event, so it is given no target and the tag that
      // suits this event is pushed here instead (see `zapPointerTag`).
      const zapRequest = nip57.makeZapRequest({
        profile: actualTarget.pubkey,
        event: null,
        amount: zapAmount,
        relays: getWriteRelayUrls(config.relayMetadata.relays),
        comment
      });

      const pointerTag = zapPointerTag(actualTarget);
      if (pointerTag) {
        zapRequest.tags.push(pointerTag);
      }

      // Sign the zap request (but don't publish to relays - only send to LNURL endpoint)
      if (!user.signer) {
        throw new Error('No signer available');
      }
      const signedZapRequest = await user.signer.signEvent(zapRequest);
      const zapRequestJson = JSON.stringify(signedZapRequest);

      try {
        // Build the query with URLSearchParams: `encodeURI` leaves `&`, `+`
        // and `#` alone, so a comment containing any of them corrupted the
        // request.
        const zapUrl = new URL(lnurlParams.callback);
        zapUrl.searchParams.set('amount', String(zapAmount));
        zapUrl.searchParams.set('nostr', zapRequestJson);

        const res = await fetch(zapUrl.toString());
        const responseData = await res.json();

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${responseData.reason || 'Unknown error'}`);
        }

        const newInvoice = responseData.pr;
        if (!newInvoice || typeof newInvoice !== 'string') {
          throw new Error('Lightning service did not return a valid invoice');
        }

        // The endpoint that produced this invoice is chosen by the
        // recipient, so the invoice is not trusted: decode it and require
        // that it charges exactly what the user approved. Without this the
        // recipient — not the sender — decides how much the sender pays,
        // and nothing downstream ever reads the invoice.
        const decodedInvoice = assertInvoiceAmount(newInvoice, zapAmount);

        // LUD-06 binds the invoice to the endpoint's `metadata`; NIP-57
        // binds it to the zap request instead. Either is fine. When neither
        // holds, the service does not issue zap invoices at all, and paying
        // it silently would buy a tip while the UI claims a zap — so show
        // the invoice labelled for what it is and leave the choice to the
        // payer.
        if (!invoiceCommitsTo(decodedInvoice, [zapRequestJson, lnurlParams.metadata])) {
          setPlainTip({ host: new URL(lnurlParams.callback).host, sats: amount });
          setInvoice(newInvoice);
          setIsZapping(false);
          return;
        }

        await payInvoice(newInvoice, amount, {
          // Only an invoice whose description hash commits to a zap request
          // can be answered with a receipt for that request.
          attestable: !!decodedInvoice.descriptionHash,
          nostrPubkey: lnurlParams.nostrPubkey,
          pointer: pointerTag,
        });
      } catch (err) {
        console.error('Zap error:', err);
        toast({
          title: 'Zap failed',
          description: (err as Error).message,
          variant: 'destructive',
        });
        setIsZapping(false);
      }
    } catch (err) {
      console.error('Zap error:', err);
      toast({
        title: 'Zap failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
      setIsZapping(false);
    }
  };

  /**
   * Pay an unbound invoice as a plain tip, at the payer's explicit request.
   *
   * Only reachable from the labelled invoice view: the sats reach the recipient
   * but no zap receipt exists for the payment, so it is reported as a tip.
   */
  const sendPlainTip = async () => {
    if (!invoice || !plainTip) return;

    setIsZapping(true);
    await payInvoice(invoice, plainTip.sats, { attestable: false });
  };

  const resetInvoice = useCallback(() => {
    setInvoice(null);
    setPlainTip(null);
  }, []);

  return {
    zaps,
    zapCount,
    totalSats,
    ...query,
    zap,
    isZapping,
    isConfirming,
    invoice,
    plainTip,
    sendPlainTip,
    setInvoice,
    resetInvoice,
    /** Whether any wallet is available to pay from, NWC or WebLN. */
    hasWallet: !!webln || !!getActiveConnection(),
  };
}
