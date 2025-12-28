import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { useAuthor } from '@/hooks/useAuthor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { genUserName } from '@/lib/genUserName';
import { nip57 } from 'nostr-tools';
import type { Event } from 'nostr-tools';

interface ZapListModalProps {
  target: Event;
  playerPubkey: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ZapListModal({ target, playerPubkey: _playerPubkey, isOpen, onClose }: ZapListModalProps) {
  const { webln, activeNWC } = useWallet();
  const { zaps: zapEvents, isLoading } = useZaps(target, webln, activeNWC);

  // Process zap events to extract amounts and sort by amount
  const processedZaps = zapEvents?.map(zap => {
    let amount = 0;

    // Extract amount using same logic as useZaps hook
    const amountTag = zap.tags.find(([name]) => name === 'amount')?.[1];
    if (amountTag) {
      amount = Math.floor(parseInt(amountTag) / 1000);
    }

    // Try bolt11
    if (amount === 0) {
      const bolt11Tag = zap.tags.find(([name]) => name === 'bolt11')?.[1];
      if (bolt11Tag) {
        try {
          amount = nip57.getSatoshisAmountFromBolt11(bolt11Tag);
        } catch {
          // Ignore parsing errors
        }
      }
    }

    // Try description
    if (amount === 0) {
      const descriptionTag = zap.tags.find(([name]) => name === 'description')?.[1];
      if (descriptionTag) {
        try {
          const zapRequest = JSON.parse(descriptionTag);
          const requestAmountTag = zapRequest.tags?.find(([name]: string[]) => name === 'amount')?.[1];
          if (requestAmountTag) {
            amount = Math.floor(parseInt(requestAmountTag) / 1000);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }

    return {
      zapperPubkey: zap.pubkey,
      amount,
      timestamp: zap.created_at,
    };
  }).filter(zap => zap.amount > 0)
    .sort((a, b) => b.amount - a.amount) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zaps Received ({processedZaps.length})</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">
            Loading zaps...
          </div>
        ) : processedZaps.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            No zaps yet
          </div>
        ) : (
          <div className="space-y-3">
            {processedZaps.map((zap, index) => (
              <ZapListItem key={zap.zapperPubkey + zap.timestamp} zap={zap} rank={index + 1} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ZapListItemProps {
  zap: {
    zapperPubkey: string;
    amount: number;
    timestamp: number;
  };
  rank: number;
}

function ZapListItem({ zap, rank }: ZapListItemProps) {
  const author = useAuthor(zap.zapperPubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(zap.zapperPubkey);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div className="flex-shrink-0">
        <Badge variant="outline" className="text-xs">
          #{rank}
        </Badge>
      </div>

      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{displayName}</p>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="font-bold text-sm">{zap.amount.toLocaleString()} sats</p>
      </div>
    </div>
  );
}