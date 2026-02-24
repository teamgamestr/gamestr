import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useAuthor } from '@/hooks/useAuthor';
import { useGameConfig } from '@/hooks/useGameConfig';
import { validateScoreEvent } from '@/hooks/useScores';
import { resolveGameByIdentifier } from '@/lib/gameConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { ScoreZapButton } from '@/components/ScoreZapButton';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import {
  ArrowLeft,
  Trophy,
  Clock,
  Zap,
  Calendar,
  Gamepad2,
  TestTube2,
} from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow, format } from 'date-fns';
import { isTestEvent, ALL_TEST_SCORES } from '@/lib/testData';
import type { NostrEvent } from '@nostrify/nostrify';
import type { Event } from 'nostr-tools';

export function ScoreDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { nostr } = useNostr();
  const { getGame } = useGameConfig();
  const { webln, activeNWC } = useWallet();

  // Fetch the score event
  const { data: scoreData, isLoading } = useQuery({
    queryKey: ['score', eventId],
    queryFn: async (c) => {
      if (!eventId) return null;

      // First check test data
      const testEvent = ALL_TEST_SCORES.find(event => event.id === eventId);
      if (testEvent) {
        const parsed = validateScoreEvent(testEvent);
        return parsed;
      }

      // Then try to fetch from relays
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([{ ids: [eventId] }], { signal });

      if (events.length > 0) {
        const parsed = validateScoreEvent(events[0]);
        return parsed;
      }

      return null;
    },
    enabled: !!eventId,
  });

  // Get player metadata
  const playerAuthor = useAuthor(scoreData?.playerPubkey || '');
  const playerMetadata = playerAuthor.data?.metadata;
  const playerDisplayName = playerMetadata?.name || genUserName(scoreData?.playerPubkey || '');

  // Fetch zap data for the score
  const { totalSats, zapCount, isLoading: zapsLoading } = useZaps(
    scoreData?.event ? [scoreData.event as unknown as Event] : [],
    webln,
    activeNWC
  );

  const { config } = useGameConfig();
  const gameMetadata = scoreData
    ? resolveGameByIdentifier(scoreData.gameIdentifier, config)?.metadata ||
      getGame(scoreData.event.pubkey, scoreData.gameIdentifier)
    : null;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">Score not found</p>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link to={gameMetadata ? `/${scoreData.gameIdentifier}` : '/'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {gameMetadata ? `Back to ${gameMetadata.name}` : 'Back to Home'}
          </Link>
        </Button>

        {/* Score Card */}
        <Card className="overflow-hidden">
          {/* Hero Section with Game Background */}
          {gameMetadata?.image && (
            <div className="relative h-48 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${gameMetadata.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
              
              {/* Floating Score Badge */}
              <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Score</p>
                  <p className="text-3xl font-bold">{scoreData.score.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <CardHeader className={gameMetadata?.image ? 'pt-6' : ''}>
            <div className="flex items-start gap-4">
              {/* Player Avatar */}
              <Link to={`/player/${scoreData.playerPubkey}`}>
                <Avatar className="h-16 w-16 ring-2 ring-background">
                  <AvatarImage src={playerMetadata?.picture} alt={playerDisplayName} />
                  <AvatarFallback className="text-lg">
                    {playerDisplayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>

              {/* Header Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/player/${scoreData.playerPubkey}`}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <h1 className="text-2xl font-bold mb-1">{playerDisplayName}</h1>
                    </Link>
                    {gameMetadata && (
                      <Link
                        to={`/${scoreData.gameIdentifier}`}
                        className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                      >
                        <Gamepad2 className="h-4 w-4" />
                        {gameMetadata.name}
                      </Link>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <ScoreZapButton
                      scoreEvent={scoreData.event as unknown as Event}
                      playerPubkey={scoreData.playerPubkey}
                      className="text-sm"
                      showCount={true}
                      zapData={{ count: zapCount, totalSats, isLoading: zapsLoading }}
                    />
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDistanceToNow(scoreData.event.created_at * 1000, { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(scoreData.event.created_at * 1000, 'PPP')}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {isTestEvent(scoreData.event) && (
              <Badge variant="secondary" className="gap-1">
                <TestTube2 className="h-3 w-3" />
                Test Data
              </Badge>
            )}

            {totalSats > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{totalSats.toLocaleString()} sats zapped</span>
              </div>
            )}

            {/* All Event Tags */}
            {scoreData.event.tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Event Tags</h3>
                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground w-1/4">Tag</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreData.event.tags.map((tag, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="px-4 py-2 font-mono text-xs text-primary">{tag[0]}</td>
                          <td className="px-4 py-2 font-mono text-xs break-all">
                            {tag.slice(1).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments Section */}
        <CommentsSection root={scoreData.event} />
      </div>
    </div>
  );
}
