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
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useZaps } from '@/hooks/useZaps';
import {
  getAllGames,
  GAMESTR_PUBKEY,
  FEATURED_GAME_PRICING,
} from '@/lib/gameConfig';
import type { Event } from 'nostr-tools';
import QRCode from 'qrcode';

interface FeatureGameDialogProps {
  children?: React.ReactNode;
  className?: string;
}

const monthOptions = Array.from(
  { length: FEATURED_GAME_PRICING.maxMonths - FEATURED_GAME_PRICING.minMonths + 1 },
  (_, i) => FEATURED_GAME_PRICING.minMonths + i,
);

/**
 * Synthetic target so useZaps can send a profile zap (NIP-57, no target
 * event) to the Gamestr account. The account's real kind 0 profile on the
 * relays provides the lightning address.
 */
function useGamestrZapTarget(): Event {
  return useMemo(
    () =>
      ({
        id: '',
        pubkey: GAMESTR_PUBKEY,
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        content: JSON.stringify({ lud16: 'zaps@gamestr.io' }),
        tags: [],
        sig: '',
      }) as unknown as Event,
    [],
  );
}

export function FeatureGameDialog({ children, className }: FeatureGameDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [months, setMonths] = useState(1);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { webln } = useWallet();
  const target = useGamestrZapTarget();

  const games = useMemo(
    () =>
      getAllGames()
        .map((g) => ({ key: g.key, name: g.metadata.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const totalSats = FEATURED_GAME_PRICING.satsPerMonth * Math.max(months, 0);

  const resetForm = () => {
    setSelectedGame('');
    setCustomName('');
    setCustomUrl('');
    setMonths(1);
  };

  const onZapSuccess = () => {
    setOpen(false);
    resetForm();
    toast({
      title: 'Featured placement requested!',
      description: 'Thanks for the zap! The Gamestr team will activate your placement shortly.',
    });
  };

  const { zap, isZapping, invoice, setInvoice } = useZaps(target, webln, null, onZapSuccess);

  // QR code for the manual-payment fallback (no WebLN wallet registered)
  useEffect(() => {
    let cancelled = false;
    if (!invoice) return;
    QRCode.toDataURL(invoice.toUpperCase(), { width: 512, margin: 2 })
      .then((url) => {
        if (!cancelled) setQrCodeUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  const handleCopy = async () => {
    if (invoice) {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      toast({ title: 'Invoice copied', description: 'Lightning invoice copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buildComment = () => {
    const monthsLabel = `${months} month${months > 1 ? 's' : ''}`;
    if (selectedGame === '__other__') {
      return `[feature-request] new game "${customName.trim()}" ${customUrl.trim()} — featured placement ${monthsLabel}`;
    }
    const game = games.find((g) => g.key === selectedGame);
    return `[feature-request] game=${game?.key ?? selectedGame} (${game?.name ?? ''}) — featured placement ${monthsLabel}`;
  };

  const handleZap = () => {
    if (selectedGame === '__other__' && (!customName.trim() || !customUrl.trim())) {
      toast({
        title: 'Missing details',
        description: 'Add the game name and URL so we can review it.',
        variant: 'destructive',
      });
      return;
    }
    zap(totalSats, buildComment());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setInvoice(null);
          resetForm();
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
                Pay with any Lightning wallet to confirm your request.
              </p>
            </div>
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Lightning Invoice QR Code" className="mx-auto rounded-lg w-full max-w-[260px]" />
            ) : (
              <div className="w-full max-w-[260px] aspect-square bg-muted animate-pulse rounded-lg mx-auto" />
            )}
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
