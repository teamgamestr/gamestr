import { useEffect, useMemo, useState } from 'react';
import { Zap, Copy, Check, ExternalLink, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useNWC } from '@/hooks/useNWCContext';
import { useAppContext } from '@/hooks/useAppContext';
import {
  getAllGames,
  GAMESTR_PUBKEY,
  GAMESTR_LIGHTNING_ADDRESS,
  FEATURED_GAME_PRICING,
} from '@/lib/gameConfig';
import { nip57 } from 'nostr-tools';
import QRCode from 'qrcode';

/**
 * Resolve the LNURL-pay callback for a static LUD-16 lightning address
 * (https://domain/.well-known/lnurlp/name). Returns null when the address
 * doesn't support Nostr zaps or can't be reached.
 */
async function resolveCallbackFromLightningAddress(address: string): Promise<string | null> {
  try {
    const [name, domain] = address.split('@');
    if (!name || !domain) return null;
    const res = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
    const params = await res.json();
    if (res.ok && params.status !== 'ERROR' && params.allowsNostr && params.nostrPubkey) {
      return params.callback as string;
    }
  } catch {
    // fall through
  }
  return null;
}

interface FeatureGameDialogProps {
  children?: React.ReactNode;
  className?: string;
}

const monthOptions = Array.from(
  { length: FEATURED_GAME_PRICING.maxMonths - FEATURED_GAME_PRICING.minMonths + 1 },
  (_, i) => FEATURED_GAME_PRICING.minMonths + i,
);

export function FeatureGameDialog({ children, className }: FeatureGameDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [months, setMonths] = useState(1);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [isZapping, setIsZapping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const { user } = useCurrentUser();
  const { data: recipient } = useAuthor(GAMESTR_PUBKEY);
  const { toast } = useToast();
  const { webln } = useWallet();
  const { sendPayment, getActiveConnection } = useNWC();
  const { presetRelays } = useAppContext();

  const games = useMemo(
    () =>
      getAllGames()
        .map((g) => ({ key: g.key, name: g.metadata.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const totalSats =
    FEATURED_GAME_PRICING.satsPerMonth * Math.max(months, 0);

  // Generate QR code for the invoice
  useEffect(() => {
    let cancelled = false;
    if (!invoice) {
      setQrCodeUrl('');
      return;
    }
    QRCode.toDataURL(invoice.toUpperCase(), {
      width: 512,
      margin: 2,
    })
      .then((url) => {
        if (!cancelled) setQrCodeUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  const buildComment = () => {
    const monthsLabel = `${months} month${months > 1 ? 's' : ''}`;
    if (selectedGame === '__other__') {
      return `[feature-request] new game "${customName.trim()}" ${customUrl.trim()} — featured placement ${monthsLabel}`;
    }
    const game = games.find((g) => g.key === selectedGame);
    return `[feature-request] game=${game?.key ?? selectedGame} (${game?.name ?? ''}) — featured placement ${monthsLabel}`;
  };

  const handleZap = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to request a featured placement.',
        variant: 'destructive',
      });
      return;
    }
    if (selectedGame === '__other__' && (!customName.trim() || !customUrl.trim())) {
      toast({
        title: 'Missing details',
        description: 'Add the game name and URL so we can review it.',
        variant: 'destructive',
      });
      return;
    }

    setIsZapping(true);
    setInvoice(null);

    try {
      if (!user.signer) throw new Error('No signer available');

      const zapRequest = nip57.makeZapRequest({
        profile: GAMESTR_PUBKEY,
        event: null,
        amount: totalSats * 1000,
        relays: presetRelays?.map((r) => r.url) ?? ['wss://relay.damus.io'],
        comment: buildComment(),
      });

      const signedZapRequest = await user.signer.signEvent(zapRequest);
      const nostrParam = encodeURIComponent(JSON.stringify(signedZapRequest));

      // Candidate LNURL-pay callbacks: the Gamestr account's Nostr profile
      // first, then the static Gamestr lightning address as a fallback in
      // case the profile hasn't loaded or is missing a lightning address.
      const candidates: string[] = [];
      if (recipient?.event) {
        const profileEndpoint = await nip57
          .getZapEndpoint(recipient.event)
          .catch(() => null);
        if (profileEndpoint) candidates.push(profileEndpoint);
      }
      const fallbackCallback = await resolveCallbackFromLightningAddress(
        GAMESTR_LIGHTNING_ADDRESS,
      );
      if (fallbackCallback && !candidates.includes(fallbackCallback)) {
        candidates.push(fallbackCallback);
      }

      if (candidates.length === 0) {
        throw new Error('No Lightning payment endpoint found for the Gamestr account');
      }

      let newInvoice: string | null = null;
      let lastError: Error = new Error('Could not create invoice');
      for (const callback of candidates) {
        try {
          const res = await fetch(`${callback}?amount=${totalSats * 1000}&nostr=${nostrParam}`);
          const responseData = await res.json();
          if (!res.ok || responseData.status === 'ERROR') {
            throw new Error(responseData.reason || `LNURL error (${res.status})`);
          }
          if (!responseData.pr || typeof responseData.pr !== 'string') {
            throw new Error('Lightning service did not return a valid invoice');
          }
          newInvoice = responseData.pr;
          break;
        } catch (error) {
          console.error('Invoice request failed:', callback, error);
          lastError = error as Error;
        }
      }
      if (!newInvoice) throw lastError;

      // Show the invoice (QR) immediately as the primary payment view.
      setInvoice(newInvoice);

      // Then try automatic payment methods quietly. If they fail, the
      // invoice stays on screen — no error toast, since the wallet UI may
      // still be open and the invoice can only be paid once.
      const activeNWC = getActiveConnection();
      if (activeNWC?.connectionString && activeNWC.isConnected) {
        try {
          await sendPayment(activeNWC, newInvoice);
          onPaid();
          return;
        } catch (error) {
          console.warn('NWC payment did not resolve:', error);
        }
      }

      if (webln) {
        try {
          let provider = webln;
          if (webln.enable && typeof webln.enable === 'function') {
            const enabled = (await webln.enable()) as typeof webln | undefined;
            if (enabled) provider = enabled;
          }
          await provider.sendPayment(newInvoice);
          onPaid();
          return;
        } catch (error) {
          console.warn('WebLN sendPayment did not resolve:', error);
        }
      }
    } catch (error) {
      console.error('Feature zap error:', error);
      toast({
        title: 'Could not create invoice',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsZapping(false);
    }
  };

  const onPaid = () => {
    setInvoice(null);
    setOpen(false);
    toast({
      title: 'Featured placement requested!',
      description: 'Thanks for the zap! The Gamestr team will activate your placement shortly.',
    });
  };

  const handleCopy = async () => {
    if (invoice) {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      toast({ title: 'Invoice copied', description: 'Lightning invoice copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setInvoice(null);
          setSelectedGame('');
          setCustomName('');
          setCustomUrl('');
          setMonths(1);
        }
      }}
    >
      <DialogTrigger asChild className={className}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Feature your game
          </DialogTitle>
          <DialogDescription>
            Get your game in the Featured section with a Lightning zap.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <p className="text-sm text-muted-foreground px-1 pb-2">
            Log in to request a featured placement for your game.
          </p>
        ) : invoice ? (
          <div className="space-y-4 pb-2">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalSats.toLocaleString()} sats</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pay to confirm your featured placement request.
              </p>
            </div>
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Lightning Invoice QR Code" className="mx-auto rounded-lg w-full max-w-[260px]" />
            ) : (
              <div className="w-full max-w-[260px] aspect-square bg-muted animate-pulse rounded-lg mx-auto" />
            )}
            <p className="text-xs text-muted-foreground text-center">
              If your wallet opened, confirm the payment there — or pay via QR / copy below.
            </p>
            <div className="flex gap-2">
              <Input value={invoice} readOnly onClick={(e) => e.currentTarget.select()} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(`lightning:${invoice}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Lightning Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="featured-game">Your game</Label>
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger id="featured-game" className="w-full">
                  <SelectValue placeholder="Choose a game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.key} value={game.key}>
                      {game.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__other__">Other / not listed yet…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedGame === '__other__' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="featured-game-name">Game name</Label>
                  <Input
                    id="featured-game-name"
                    placeholder="My Awesome Game"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featured-game-url">Game URL</Label>
                  <Input
                    id="featured-game-url"
                    type="url"
                    placeholder="https://mygame.example"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="featured-months">Duration</Label>
              <Select
                value={String(months)}
                onValueChange={(value) => setMonths(parseInt(value, 10))}
              >
                <SelectTrigger id="featured-months" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} month{m > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold">
                {totalSats.toLocaleString()} sats
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({FEATURED_GAME_PRICING.satsPerMonth.toLocaleString()}/mo)
                </span>
              </span>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={isZapping || !selectedGame || (selectedGame === '__other__' && (!customName.trim() || !customUrl.trim()))}
              onClick={handleZap}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isZapping ? 'Creating invoice...' : `Zap ${totalSats.toLocaleString()} sats`}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Paid via Lightning zap to the Gamestr team. Placements are reviewed and activated after payment.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
