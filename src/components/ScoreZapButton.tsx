import { useState } from 'react';
import { ZapDialog } from '@/components/ZapDialog';
import { ZapModal } from '@/components/NoLightningAddressModal';
import { ZapListModal } from '@/components/ZapListModal';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { Zap } from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
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
  const [showModal, setShowModal] = useState(false);
  const [showZapListModal, setShowZapListModal] = useState(false);
  const { user } = useCurrentUser();
  const { data: playerAuthor } = useAuthor(playerPubkey);
  const { webln, activeNWC } = useWallet();

  // Only fetch data if not provided externally
  const { totalSats: fetchedTotalSats, isLoading } = useZaps(
    externalZapData ? [] : scoreEvent ?? [],
    webln,
    activeNWC
  );

  // Use external data if provided, otherwise use fetched data
  const totalSats = externalZapData?.totalSats ?? fetchedTotalSats;
  const showLoading = externalZapData?.isLoading || isLoading;

  const hasLightningAddress = !!(playerAuthor?.metadata?.lud16 || playerAuthor?.metadata?.lud06);
  const isLoggedIn = !!user;
  const isSelf = user?.pubkey === playerPubkey;

  const playerName = playerAuthor?.metadata?.name || genUserName(playerPubkey);
  const playerAvatar = playerAuthor?.metadata?.picture;

  // Create a modified event that has the player's pubkey
  // This allows the ZapDialog to correctly send zaps to the player
  const playerEvent: Event = {
    ...scoreEvent,
    pubkey: playerPubkey, // Override with player's pubkey for zap routing
  };



  // Always show zap button for consistent layout
  const handleZapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoggedIn && hasLightningAddress) {
      // Can zap normally - the ZapDialog will handle this
      return;
    } else {
      // Show modal for other cases (no address, not logged in, etc.)
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        {/* Zap Button - always visible */}
        {isLoggedIn && hasLightningAddress ? (
          <ZapDialog target={playerEvent}>
            <div className={`flex items-center gap-1 cursor-pointer hover:text-primary transition-colors ${className}`}>
              <Zap className="h-4 w-4" />
              <span className="text-xs">
                {showLoading ? '...' : 'Zap'}
              </span>
            </div>
          </ZapDialog>
        ) : (
          <div
            className={`flex items-center gap-1 cursor-pointer hover:text-primary transition-colors ${className}`}
            onClick={handleZapClick}
          >
            <Zap className="h-4 w-4" />
            <span className="text-xs">
              {showLoading ? '...' : 'Zap'}
            </span>
          </div>
        )}

        {/* Total Amount - always show if available */}
        {showCount && totalSats > 0 && !showLoading && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowZapListModal(true);
            }}
            className="text-xs text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
            title="View zappers"
          >
            {totalSats.toLocaleString()} sats
          </button>
        )}
      </div>

      {/* Modal for cases where zapping isn't directly available */}
      <ZapModal
        playerPubkey={playerPubkey}
        playerName={playerName}
        playerAvatar={playerAvatar}
        scoreEvent={scoreEvent}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        hasLightningAddress={hasLightningAddress}
        isLoggedIn={isLoggedIn}
        isSelf={isSelf}
      />

      {/* Modal to view list of zappers */}
      <ZapListModal
        target={scoreEvent}
        playerPubkey={playerPubkey}
        isOpen={showZapListModal}
        onClose={() => setShowZapListModal(false)}
      />
    </>
  );
}
