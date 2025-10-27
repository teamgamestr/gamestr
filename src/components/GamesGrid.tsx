import { GameCard } from './GameCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { RelaySelector } from '@/components/RelaySelector';
import type { GameMetadata } from '@/lib/gameConfig';

interface Game {
  pubkey: string;
  gameIdentifier: string;
  metadata: GameMetadata;
  scoreCount?: number;
  topScore?: number;
}

interface GamesGridProps {
  games: Game[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function GamesGrid({ games, isLoading, emptyMessage = 'No games found' }: GamesGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="col-span-full">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <p className="text-muted-foreground text-lg">
                {emptyMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                Try switching to a different relay to discover more games
              </p>
              <RelaySelector className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {games.map((game) => (
        <GameCard
          key={`${game.pubkey}:${game.gameIdentifier}`}
          pubkey={game.pubkey}
          gameIdentifier={game.gameIdentifier}
          metadata={game.metadata}
          scoreCount={game.scoreCount}
          topScore={game.topScore}
        />
      ))}
    </div>
  );
}
