import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Sparkles, Trophy } from 'lucide-react';
import type { GameMetadata } from '@/lib/gameConfig';
import { isNewGame } from '@/lib/gameConfig';

interface GameCardProps {
  pubkey: string;
  gameIdentifier: string;
  metadata: GameMetadata;
  scoreCount?: number;
  topScore?: number;
  trending?: boolean;
  className?: string;
}

export function GameCard({
  gameIdentifier,
  metadata,
  scoreCount,
  topScore,
  trending,
  className = '',
}: GameCardProps) {
  const gameUrl = `/${gameIdentifier}`;

  return (
    <Link to={gameUrl}>
      <Card className={`group h-full flex flex-col overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer ${className}`}>
        {/* Game Image */}
        <div className="relative aspect-square overflow-hidden bg-muted/60 ring-1 ring-inset ring-white/5">
          <img
            src={metadata.image}
            alt={metadata.name}
            className="w-full h-full object-contain transition-transform group-hover:scale-105 p-2"
            loading="lazy"
          />
          
          {/* Overlay badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {trending && (
              <Badge variant="destructive" className="gap-1 shadow-lg">
                <Flame className="h-3 w-3" />
                Trending
              </Badge>
            )}
            {isNewGame(metadata) && (
              <Badge variant="secondary" className="gap-1 shadow-lg">
                <Sparkles className="h-3 w-3" />
                New
              </Badge>
            )}
            {metadata.featured && (
              <Badge className="gap-1 shadow-lg bg-yellow-500 hover:bg-yellow-600">
                <Trophy className="h-3 w-3" />
                Featured
              </Badge>
            )}
          </div>
        </div>

        {/* Game Info */}
        <CardHeader className="pb-3 flex-1">
          <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {metadata.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {metadata.description}
          </p>
        </CardHeader>

        <CardContent className="pb-3">
          {/* Genre pills */}
          <div className="flex flex-wrap gap-1">
            {metadata.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="outline" className="text-xs">
                {genre}
              </Badge>
            ))}
            {metadata.genres.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{metadata.genres.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>

        {/* Stats Footer */}
        <CardFooter className="pt-3 border-t mt-auto">
          <div className="flex justify-between w-full text-sm text-muted-foreground">
            {scoreCount !== undefined && (
              <span>{scoreCount.toLocaleString()} scores</span>
            )}
            {topScore !== undefined && (
              <span className="font-semibold ml-auto">
                Top: {topScore.toLocaleString()}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
