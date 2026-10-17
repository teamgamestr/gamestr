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
import { isAddressable, unverifiableInvoiceMessage, zapPointerTag } from '@/lib/zapRequests';

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
  const { presetRelays } = useAppContext();
  const queryClient = useQueryClient();

  // Handle the case where an empty array is passed (from ZapButton when external data is provided)
  const actualTarget = Array.isArray(target) ? (target.length > 0 ? target[0] : null) : target;

  const author = useAuthor(actualTarget?.pubkey);
  const { sendPayment, getActiveConnection } = useNWC();
  const [isZapping, setIsZapping] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);

  // Cleanup state when component unmounts
  useEffect(() => {
    return () => {
      setIsZapping(false);
      setInvoice(null);
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

  const zap = async (amount: number, comment: string) => {
    if (amount <= 0) {
      return;
    }

    setIsZapping(true);
    setInvoice(null); // Clear any previous invoice at the start

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
        relays: presetRelays?.map(r => r.url) ?? ['wss://nos.lol'],
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
            // and nothing downstream ever reads the invoice. Throwing here
            // aborts before any wallet is touched, on every payment path.
            const decodedInvoice = assertInvoiceAmount(newInvoice, zapAmount);

            // LUD-06 binds the invoice to the endpoint's `metadata`; NIP-57
            // binds it to the zap request instead. Either is fine, anything
            // else means the invoice was not issued for this request.
            if (!invoiceCommitsTo(decodedInvoice, [zapRequestJson, lnurlParams.metadata])) {
              throw new Error(unverifiableInvoiceMessage(lnurlParams.callback));
            }

            // Get the current active NWC connection dynamically
            const currentNWCConnection = getActiveConnection();

            // Try NWC first if available and properly connected
            if (currentNWCConnection && currentNWCConnection.connectionString && currentNWCConnection.isConnected) {
              try {
                await sendPayment(currentNWCConnection, newInvoice);

                // Clear states immediately on success
                setIsZapping(false);
                setInvoice(null);

                toast({
                  title: 'Zap successful!',
                  description: `You sent ${amount} sats via NWC to the author.`,
                });

                // Invalidate zap queries to refresh counts
                queryClient.invalidateQueries({ queryKey: ['nostr', 'zaps'] });

                // Close dialog last to ensure clean state
                onZapSuccess?.();
                return;
              } catch (nwcError) {
                console.error('NWC payment did not confirm:', nwcError);

                // Same ambiguity as WebLN: a timeout or a dismissed request does
                // not prove the payment failed.
                const errorMessage = nwcError instanceof Error ? nwcError.message : 'Unknown NWC error';
                toast({
                  title: 'Payment not confirmed',
                  description:
                    `${errorMessage}. Check your wallet before paying again — the invoice below is only needed if it did not go through.`,
                  variant: 'destructive',
                });
              }
            }

            if (webln) {  // Try WebLN next
              try {
                // For native WebLN, we may need to enable it first
                let webLnProvider = webln;
                if (webln.enable && typeof webln.enable === 'function') {
                  const enabledProvider = await webln.enable();
                  // Some implementations return the provider, others return void
                  // Cast to WebLNProvider to handle both cases
                  const provider = enabledProvider as WebLNProvider | undefined;
                  if (provider) {
                    webLnProvider = provider;
                  }
                }

                await webLnProvider.sendPayment(newInvoice);

                // Clear states immediately on success
                setIsZapping(false);
                setInvoice(null);

                toast({
                  title: 'Zap successful!',
                  description: `You sent ${amount} sats to the author.`,
                });

                // Invalidate zap queries to refresh counts
                queryClient.invalidateQueries({ queryKey: ['nostr', 'zaps'] });

                // Close dialog last to ensure clean state
                onZapSuccess?.();
              } catch (weblnError) {
                console.error('WebLN payment did not confirm:', weblnError);

                // The wallet's own UI may have completed (or still be completing)
                // the payment even though the API call did not resolve, so this
                // says "could not confirm" rather than "failed" — and tells the
                // payer to check before paying a second time.
                const errorMessage = weblnError instanceof Error ? weblnError.message : 'Unknown WebLN error';
                toast({
                  title: 'Payment not confirmed',
                  description:
                    `${errorMessage}. Check your wallet before paying again — the invoice below is only needed if it did not go through.`,
                  variant: 'destructive',
                });

                setInvoice(newInvoice);
                setIsZapping(false);
              }
            } else { // Default - show QR code and manual Lightning URI
              setInvoice(newInvoice);
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

  const resetInvoice = useCallback(() => {
    setInvoice(null);
  }, []);

  return {
    zaps,
    zapCount,
    totalSats,
    ...query,
    zap,
    isZapping,
    invoice,
    setInvoice,
    resetInvoice,
  };
}
