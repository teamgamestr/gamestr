import { Crown } from 'lucide-react';
import { NIP05PurchaseForm } from '@/components/NIP05PurchaseForm';
import { NIP05Directory } from '@/components/NIP05Directory';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNIP05NamesByPubkey } from '@/hooks/useNIP05';
import { useQueryClient } from '@tanstack/react-query';

export function NIP05Store() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: owned } = useNIP05NamesByPubkey(user?.pubkey);
  const ownedName = owned?.names[0]?.name;

  const handleClaimed = () => {
    queryClient.invalidateQueries({ queryKey: ['nip05'] });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-5xl font-bold flex items-center justify-center gap-3">
          <Crown className="h-8 w-8 md:h-10 md:w-10 text-yellow-500" />
          gamestr.me
        </h1>
        <p className="text-muted-foreground text-lg">
          Your verified Nostr identity on gamestr.me
        </p>
      </div>

      <NIP05PurchaseForm ownedName={ownedName} onClaimed={handleClaimed} />

      <NIP05Directory />
    </div>
  );
}
