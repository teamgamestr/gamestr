import { ZapDialog } from '@/components/ZapDialog';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { Zap } from 'lucide-react';
import type { Event } from 'nostr-tools';

interface ScoreZapButtonProps {
  scoreEvent: Event;
  playerPubkey: string;
  className?: string;
  showCount?: boolean;
  zapData?: { count: number; totalSats: number; isLoading?: boolean };
}

/**
 * ZapButton specifically for score events.
 * Score events are published by game developers (event.pubkey),
 * but zaps should go to the player (playerPubkey from 'p' tag).
 * 
 * This component checks the player's lightning address instead of
 * the event author's address.
 */
export function ScoreZapButton({
  scoreEvent,
  playerPubkey,
  className = "text-xs ml-1",
  showCount = true,
  zapData: externalZapData
}: ScoreZapButtonProps) {
  const { user } = useCurrentUser();
  const { data: playerAuthor } = useAuthor(playerPubkey);
  const { webln, activeNWC } = useWallet();

  // Only fetch data if not provided externally
  const { totalSats: fetchedTotalSats, isLoading } = useZaps(
    externalZapData ? [] : scoreEvent ?? [],
    webln,
    activeNWC
  );

  // Don't show zap button if:
  // - User is not logged in
  // - User is the player (can't zap yourself)
  // - Player has no lightning address
  if (!user || !scoreEvent || user.pubkey === playerPubkey || (!playerAuthor?.metadata?.lud16 && !playerAuthor?.metadata?.lud06)) {
    return null;
  }

  // Use external data if provided, otherwise use fetched data
  const totalSats = externalZapData?.totalSats ?? fetchedTotalSats;
  const showLoading = externalZapData?.isLoading || isLoading;

  // Create a modified event that has the player's pubkey
  // This allows the ZapDialog to correctly send zaps to the player
  const playerEvent: Event = {
    ...scoreEvent,
    pubkey: playerPubkey, // Override with player's pubkey for zap routing
  };

  return (
    <ZapDialog target={playerEvent}>
      <div className={`flex items-center gap-1 cursor-pointer hover:text-primary transition-colors ${className}`}>
        <Zap className="h-4 w-4" />
        <span className="text-xs">
          {showLoading ? (
            '...'
          ) : showCount && totalSats > 0 ? (
            `${totalSats.toLocaleString()}`
          ) : (
            'Zap'
          )}
        </span>
      </div>
    </ZapDialog>
  );
}
