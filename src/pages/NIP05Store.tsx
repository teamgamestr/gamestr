import { Crown } from 'lucide-react';
import { NIP05PurchaseForm } from '@/components/NIP05PurchaseForm';
import { NIP05Directory } from '@/components/NIP05Directory';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNIP05NamesByPubkey, useNIP05Config } from '@/hooks/useNIP05';
import { useTheme } from '@/hooks/useTheme';
import { useQueryClient } from '@tanstack/react-query';

export function NIP05Store() {
  const { theme } = useTheme();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: owned } = useNIP05NamesByPubkey(user?.pubkey);
  const { data: config } = useNIP05Config();
  const domain = config?.domain ?? 'gamestr.me';
  const ownedName = owned?.names[0]?.name;

  const handleClaimed = () => {
    queryClient.invalidateQueries({ queryKey: ['nip05'] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div
        className={`relative overflow-hidden ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
        style={{
          backgroundColor: theme === 'light' ? '#f8f9ff' : '#0a0a1a',
          backgroundImage: theme === 'light'
            ? `
              repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(200,150,0,0.05) 31px, rgba(200,150,0,0.05) 32px),
              repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(200,150,0,0.05) 31px, rgba(200,150,0,0.05) 32px)
            `
            : `
              repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(255,200,0,0.07) 31px, rgba(255,200,0,0.07) 32px),
              repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(255,200,0,0.07) 31px, rgba(255,200,0,0.07) 32px)
            `,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: theme === 'light'
              ? "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 4px)"
              : "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 4px)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full ${theme === 'light' ? 'bg-yellow-300/20' : 'bg-yellow-500/20'} blur-3xl`} />
          <div className={`absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full ${theme === 'light' ? 'bg-amber-300/10' : 'bg-amber-400/10'} blur-2xl`} />
          <div className={`absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full ${theme === 'light' ? 'bg-orange-300/10' : 'bg-orange-400/10'} blur-2xl`} />
        </div>

        <div className="relative container mx-auto px-4 flex items-center justify-center min-h-[260px] md:min-h-[340px]">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold flex items-center justify-center gap-3">
              <Crown className="h-10 w-10 md:h-14 md:w-14 text-yellow-500 drop-shadow-[0_0_16px_rgba(234,179,8,0.6)]" />
              {domain}
            </h1>
            <p className={`text-xl ${theme === 'light' ? 'text-gray-700' : 'text-white/90'}`}>
              Your verified Nostr identity on {domain}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-8">
        <NIP05PurchaseForm ownedName={ownedName} onClaimed={handleClaimed} />

        <NIP05Directory />
      </div>
    </div>
  );
}
