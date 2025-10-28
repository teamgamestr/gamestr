import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useAuthor } from '@/hooks/useAuthor';
import { useGameConfig } from '@/hooks/useGameConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { ZapButton } from '@/components/ZapButton';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import {
  ArrowLeft,
  Trophy,
  Clock,
  Target,
  Zap,
  MessageSquare,
  Calendar,
  Gamepad2,
  Award,
  Timer,
  TestTube2,
} from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow, format } from 'date-fns';
import { isTestEvent } from '@/lib/testData';
import type { NostrEvent } from '@nostrify/nostrify';
import type { Event } from 'nostr-tools';

interface ParsedScore {
  event: NostrEvent;
  gameIdentifier: string;
  score: number;
  playerPubkey: string;
  state?: string;
  level?: string;
  difficulty?: string;
  mode?: string;
  duration?: number;
  achievements?: string[];
  version?: string;
  platform?: string;
  genres?: string[];
}

function validateScoreEvent(event: NostrEvent): ParsedScore | null {
  if (event.kind !== 30762) return null;

  const gameTag = event.tags.find(([name]) => name === 'game')?.[1];
  const scoreTag = event.tags.find(([name]) => name === 'score')?.[1];
  const playerTag = event.tags.find(([name]) => name === 'p')?.[1];

  if (!gameTag || !scoreTag || !playerTag) return null;

  const score = parseInt(scoreTag);
  if (isNaN(score)) return null;

  const stateTag = event.tags.find(([name]) => name === 'state')?.[1];
  const levelTag = event.tags.find(([name]) => name === 'level')?.[1];
  const difficultyTag = event.tags.find(([name]) => name === 'difficulty')?.[1];
  const modeTag = event.tags.find(([name]) => name === 'mode')?.[1];
  const durationTag = event.tags.find(([name]) => name === 'duration')?.[1];
  const achievementsTag = event.tags.find(([name]) => name === 'achievements')?.[1];
  const versionTag = event.tags.find(([name]) => name === 'version')?.[1];
  const platformTag = event.tags.find(([name]) => name === 'platform')?.[1];
  const genreTags = event.tags.filter(([name]) => name === 't').map(([, value]) => value);

  return {
    event,
    gameIdentifier: gameTag,
    score,
    playerPubkey: playerTag,
    state: stateTag,
    level: levelTag,
    difficulty: difficultyTag,
    mode: modeTag,
    duration: durationTag ? parseInt(durationTag) : undefined,
    achievements: achievementsTag ? achievementsTag.split(',').map(a => a.trim()) : undefined,
    version: versionTag,
    platform: platformTag,
    genres: genreTags.length > 0 ? genreTags : undefined,
  };
}

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

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // First try to fetch by event ID
      const events = await nostr.query([{ ids: [eventId] }], { signal });

      if (events.length > 0) {
        const parsed = validateScoreEvent(events[0]);
        return parsed;
      }

      return null;
    },
    enabled: !!eventId,
  });

  // Fetch zap data
  const { totalSats, zapCount, isLoading: zapsLoading } = useZaps(
    scoreData?.event ? [scoreData.event as unknown as Event] : [],
    webln,
    activeNWC
  );

  // Get player metadata
  const playerAuthor = useAuthor(scoreData?.playerPubkey || '');
  const playerMetadata = playerAuthor.data?.metadata;
  const playerDisplayName = playerMetadata?.name || genUserName(scoreData?.playerPubkey || '');

  // Get game metadata
  const gameMetadata = scoreData
    ? getGame(scoreData.event.pubkey, scoreData.gameIdentifier)
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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link to={gameMetadata ? `/game/${scoreData.event.pubkey}/${scoreData.gameIdentifier}` : '/'}>
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
                        to={`/game/${scoreData.event.pubkey}/${scoreData.gameIdentifier}`}
                        className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                      >
                        <Gamepad2 className="h-4 w-4" />
                        {gameMetadata.name}
                      </Link>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <ZapButton
                      target={scoreData.event as unknown as Event}
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
            {/* Score Content */}
            {scoreData.event.content && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-lg">{scoreData.event.content}</p>
              </div>
            )}

            {/* Score Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {!gameMetadata?.image && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <Target className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{scoreData.score.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </CardContent>
                </Card>
              )}

              {scoreData.level && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <Trophy className="h-5 w-5 mx-auto mb-2 text-yellow-500" />
                    <p className="text-2xl font-bold">{scoreData.level}</p>
                    <p className="text-xs text-muted-foreground">Level</p>
                  </CardContent>
                </Card>
              )}

              {scoreData.duration && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <Timer className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{formatDuration(scoreData.duration)}</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </CardContent>
                </Card>
              )}

              {totalSats > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <Zap className="h-5 w-5 mx-auto mb-2 text-orange-500" />
                    <p className="text-2xl font-bold">{totalSats.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Sats Zapped</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Badges Section */}
            <div className="flex flex-wrap gap-2">
              {isTestEvent(scoreData.event) && (
                <Badge variant="secondary" className="gap-1">
                  <TestTube2 className="h-3 w-3" />
                  Test Data
                </Badge>
              )}
              {scoreData.difficulty && (
                <Badge variant="outline">
                  <Award className="h-3 w-3 mr-1" />
                  {scoreData.difficulty}
                </Badge>
              )}
              {scoreData.mode && (
                <Badge variant="outline">
                  <Gamepad2 className="h-3 w-3 mr-1" />
                  {scoreData.mode}
                </Badge>
              )}
              {scoreData.platform && (
                <Badge variant="outline">{scoreData.platform}</Badge>
              )}
              {scoreData.version && (
                <Badge variant="outline">v{scoreData.version}</Badge>
              )}
              {scoreData.state && scoreData.state !== 'active' && (
                <Badge variant={scoreData.state === 'verified' ? 'default' : 'destructive'}>
                  {scoreData.state}
                </Badge>
              )}
            </div>

            {/* Achievements */}
            {scoreData.achievements && scoreData.achievements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Achievements Unlocked
                </h3>
                <div className="flex flex-wrap gap-2">
                  {scoreData.achievements.map((achievement) => (
                    <Badge key={achievement} variant="secondary">
                      {achievement}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Game Genres */}
            {scoreData.genres && scoreData.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {scoreData.genres.map((genre) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CommentsSection root={scoreData.event} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
