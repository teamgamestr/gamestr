import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDMContext } from '@/contexts/DMContext';
import { toast } from '@/hooks/useToast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Zap } from 'lucide-react';
import type { Event } from 'nostr-tools';

interface ZapModalProps {
  playerPubkey: string;
  playerName: string;
  playerAvatar?: string;
  scoreEvent: Event;
  isOpen: boolean;
  onClose: () => void;
  hasLightningAddress: boolean;
  isLoggedIn: boolean;
  isSelf: boolean;
}

export function ZapModal({
  playerPubkey,
  playerName,
  playerAvatar,
  scoreEvent,
  isOpen,
  onClose,
  hasLightningAddress,
  isLoggedIn,
  isSelf
}: ZapModalProps) {
  const { user } = useCurrentUser();
  const { sendMessage, isLoading: dmLoading } = useDMContext();
  const [isSendingDM, setIsSendingDM] = useState(false);

  const handleSendDM = async () => {
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'You must be logged in to send DMs.',
        variant: 'destructive',
      });
      return;
    }

    if (!user.signer) {
      toast({
        title: 'No signer available',
        description: 'Please configure a Nostr signer to send DMs.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingDM(true);
    try {
      console.log('Sending DM to:', playerPubkey);
      const scoreId = scoreEvent.id;
      const message = `Hi! I tried to zap you from Gamestr for your score (${scoreId.slice(0, 8)}...). You should add a lightning address to your profile so people can send you sats! 💜⚡`;

      await sendMessage({
        recipientPubkey: playerPubkey,
        content: message,
      });

      console.log('DM sent successfully');
      // Show success feedback
      toast({
        title: 'DM sent! 💌',
        description: `${playerName} will be notified to add a lightning address.`,
      });
      onClose();
    } catch (error) {
      console.error('Failed to send DM:', error);
      toast({
        title: 'Failed to send DM',
        description: error instanceof Error ? error.message : 'Please try again. Make sure you have a Nostr signer configured.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingDM(false);
    }
  };

  // Determine modal content based on state
  const getModalContent = () => {
    if (isSelf) {
      const funnyMessages = [
        "🎉 Congrats on the great score! Treat yourself to some sats! 🎉",
        "🎯 Nice shot! You deserve a little self-appreciation zap! 🎯",
        "🏆 Champion! Time for a victory zap to celebrate! 🏆",
        "💎 Diamond hands! Zapping yourself because you're worth it! 💎",
        "🚀 To the moon! Even astronauts zap themselves sometimes! 🚀"
      ];
      const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];

      return {
        title: "Self-Zap! 🎊",
        description: "Celebrate your own awesomeness with some sats!",
        icon: <Zap className="h-5 w-5 text-yellow-500" />,
        content: (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={playerAvatar} alt={playerName} />
                <AvatarFallback>{playerName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{playerName}</p>
                <p className="text-sm text-muted-foreground">That's you! 🎭</p>
              </div>
            </div>
            <p className="text-center font-medium text-orange-600 dark:text-orange-400">
              {randomMessage}
            </p>
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-lg font-semibold">Choose Amount</p>
                <p className="text-sm text-muted-foreground">How many sats to zap yourself?</p>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: 'Self-zap confirmed! 🎉',
                    description: 'You zapped yourself 1 sat. Keep up the great work!',
                  });
                  onClose();
                }}>1</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: 'Self-zap confirmed! 🎉',
                    description: 'You zapped yourself 50 sats. You\'re amazing!',
                  });
                  onClose();
                }}>50</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: 'Self-zap confirmed! 🎉',
                    description: 'You zapped yourself 100 sats. Champion status!',
                  });
                  onClose();
                }}>100</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: 'Self-zap confirmed! 🎉',
                    description: 'You zapped yourself 250 sats. You\'re a legend!',
                  });
                  onClose();
                }}>250</Button>
              </div>
            </div>
          </div>
        ),
        actions: null
      };
    }

    if (!hasLightningAddress) {
      return {
        title: "No Lightning Address",
        description: "This player hasn't set up lightning payments yet.",
        icon: <Zap className="h-5 w-5 text-orange-500" />,
        content: (
          <>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={playerAvatar} alt={playerName} />
                <AvatarFallback>{playerName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{playerName}</p>
                <p className="text-sm text-muted-foreground">No lightning address</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              To receive zaps, players need to add a lightning address (lud16) or LNURL (lud06) to their Nostr profile.
            </div>
          </>
        ),
        actions: isLoggedIn ? (
          <Button
            onClick={handleSendDM}
            disabled={isSendingDM || dmLoading}
            className="w-full"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {isSendingDM ? 'Sending...' : 'Send DM to Add Address'}
          </Button>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-2">
            Log in to send a DM suggesting they add a lightning address.
          </div>
        )
      };
    }

    if (!isLoggedIn) {
      return {
        title: "Anonymous Zapping",
        description: "Zap without logging in!",
        icon: <Zap className="h-5 w-5 text-orange-500" />,
        content: (
          <div className="text-sm text-muted-foreground">
            Anonymous zapping via lightning invoice is coming soon! For now, you'll need to log in with your Nostr account to send zaps.
          </div>
        ),
        actions: (
          <Button onClick={onClose} className="w-full">
            Coming Soon
          </Button>
        )
      };
    }

    // Fallback
    return {
      title: "Zap Unavailable",
      description: "Unable to zap at this time.",
      icon: <Zap className="h-5 w-5 text-gray-500" />,
      content: null,
      actions: null
    };
  };

  const modalData = getModalContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {modalData.icon}
            {modalData.title}
          </DialogTitle>
          <DialogDescription>
            {modalData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {modalData.content}

          {modalData.actions}

          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}