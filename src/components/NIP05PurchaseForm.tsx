import { useState, useEffect } from 'react';
import { Crown, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNIP05Availability, useCreateNIP05Order, type NIP05Order } from '@/hooks/useNIP05';
import { NIP05ZapDialog } from '@/components/NIP05ZapDialog';
import { buildNIP05Identifier, isValidNIP05LocalPart, NIP05_PRICE_SATS } from '@/lib/nip05';

interface NIP05PurchaseFormProps {
  ownedName?: string;
  onClaimed: () => void;
}

export function NIP05PurchaseForm({ ownedName, onClaimed }: NIP05PurchaseFormProps) {
  const { user } = useCurrentUser();
  const [name, setName] = useState(ownedName || '');
  const [order, setOrder] = useState<NIP05Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const normalized = name.trim().toLowerCase();
  const { data: availability, isLoading: checking, isError } = useNIP05Availability(normalized, user?.pubkey);
  const createOrder = useCreateNIP05Order();

  useEffect(() => {
    if (ownedName) setName(ownedName);
  }, [ownedName]);

  const handleAction = async (action: 'new' | 'renew') => {
    if (!user?.pubkey || !normalized) return;
    const result = await createOrder.mutateAsync({ name: normalized, action });
    setOrder(result.order);
    setDialogOpen(true);
  };

  const canBuy = availability?.available && !createOrder.isPending;
  const canRenew = availability?.renewable && !createOrder.isPending;
  const showInvalid = normalized.length > 0 && !isValidNIP05LocalPart(normalized);

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            Claim your gamestr.me name
          </CardTitle>
          <CardDescription>
            Get a verified NIP-05 identifier on gamestr.me for {NIP05_PRICE_SATS.toLocaleString()} sats per year.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user?.pubkey && (
            <p className="text-sm text-muted-foreground">Log in with Nostr to claim a name.</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="nip05-name">Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="nip05-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                placeholder="satoshi"
                className="flex-1"
              />
              <span className="text-muted-foreground whitespace-nowrap">@gamestr.me</span>
            </div>
            {normalized && (
              <div className="text-sm">
                {showInvalid ? (
                  <span className="text-destructive">Names must be 2–32 characters: a-z, 0-9, -, _, .</span>
                ) : checking || !availability ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                  </span>
                ) : isError ? (
                  <span className="text-destructive">Could not check availability. Is the server running?</span>
                ) : availability.available ? (
                  <span className="text-green-600">{buildNIP05Identifier(normalized)} is available!</span>
                ) : availability.renewable ? (
                  <span className="text-blue-600">{buildNIP05Identifier(normalized)} is yours — renew for another year.</span>
                ) : (
                  <span className="text-destructive">{buildNIP05Identifier(normalized)} is already taken.</span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {canBuy && (
              <Button onClick={() => handleAction('new')} disabled={!user?.pubkey || createOrder.isPending} className="flex-1">
                {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Buy for {NIP05_PRICE_SATS.toLocaleString()} sats
              </Button>
            )}
            {canRenew && (
              <Button onClick={() => handleAction('renew')} disabled={!user?.pubkey || createOrder.isPending} variant="outline" className="flex-1">
                {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                Renew for {NIP05_PRICE_SATS.toLocaleString()} sats
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <NIP05ZapDialog
        order={order}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          onClaimed();
        }}
      />
    </>
  );
}
