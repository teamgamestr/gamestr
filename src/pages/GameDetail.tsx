import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { type LeaderboardPeriod } from '@/hooks/useScores';
import { useLeaderboardWithTestData } from '@/hooks/useScoresWithTestData';
import { useGameConfig } from '@/hooks/useGameConfig';
import { useAuthor } from '@/hooks/useAuthor';
import { ZapButton } from '@/components/ZapButton';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ExternalLink, Trophy, Medal, Award, Clock, Target, User } from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
import { ScoreZapButton } from '@/components/ScoreZapButton';

import { formatDistanceToNow } from 'date-fns';
import type { Event } from 'nostr-tools';
import { nip19 } from 'nostr-tools';

export function GameDetail() {
  const { pubkey, gameIdentifier } = useParams<{ pubkey: string; gameIdentifier: string }>();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const [mode, setMode] = useState<string | undefined>();

  const { getGame } = useGameConfig();
  const metadata = pubkey && gameIdentifier ? getGame(pubkey, gameIdentifier) : null;

  useSeoMeta({
    title: metadata ? `${metadata.name} Leaderboard - Gamestr` : 'Game - Gamestr',
    description: metadata?.description || 'View the leaderboard for this game on Gamestr.',
    ogImage: metadata?.image,
    ogTitle: metadata ? `${metadata.name} Leaderboard` : 'Game Leaderboard',
    ogDescription: metadata?.description || 'View the leaderboard for this game on Gamestr.',
  });
  
  // Fetch game developer's profile
  const developerAuthor = useAuthor(pubkey);
  const developerMetadata = developerAuthor.data?.metadata;
  const developerDisplayName = developerMetadata?.name || metadata?.developer || genUserName(pubkey || '');

  const { data: scores, isLoading } = useLeaderboardWithTestData(
    gameIdentifier || '',
    period,
    {
      difficulty,
      mode,
      developerPubkey: pubkey,
      limit: 100,
      includeTestData: false,
    }
  );

  // Get unique difficulties and modes from scores
  const difficulties = Array.from(new Set(scores?.map(s => s.difficulty).filter(Boolean))) as string[];
  const modes = Array.from(new Set(scores?.map(s => s.mode).filter(Boolean))) as string[];

  if (!pubkey || !gameIdentifier || !metadata) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Game not found</p>
            <Button asChild className="mt-4">
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${metadata.image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />

        <div className="relative container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Games
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Game Image */}
            <div className="w-full md:w-80 aspect-video rounded-lg overflow-hidden shadow-2xl">
              <img
                src={metadata.image}
                alt={metadata.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Game Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">{metadata.name}</h1>
                <p className="text-lg text-muted-foreground">{metadata.description}</p>
              </div>

              {/* Genre Pills */}
              <div className="flex flex-wrap gap-2">
                {metadata.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 text-sm">
                {scores && scores.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span>{scores.length} scores submitted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span>Top Score: {scores[0].score.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {metadata.url && (
                  <Button asChild size="lg">
                    <a href={metadata.url} target="_blank" rel="noopener noreferrer">
                      Play Game
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
                {pubkey && developerAuthor.data?.event && (
                  <div className="cursor-pointer">
                    <ZapButton 
                      target={developerAuthor.data.event as unknown as Event}
                      showCount={true}
                      className="h-11 px-6 text-base font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    />
                  </div>
                )}
                {pubkey && (() => {
                  // Check if pubkey is a valid hex string (64 characters, all hex)
                  const isValidHex = /^[0-9a-f]{64}$/i.test(pubkey);
                  const profileUrl = isValidHex ? `/${nip19.npubEncode(pubkey)}` : `/player/${pubkey}`;
                  
                  return (
                    <Button variant="outline" size="lg" asChild>
                      <Link to={profileUrl}>
                        <User className="mr-2 h-4 w-4" />
                        By {developerDisplayName}
                      </Link>
                    </Button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Leaderboard Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {metadata.name} Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Time Period */}
            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}>
                <TabsList className="grid grid-cols-4 w-full max-w-md">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="all-time">All Time</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Difficulty Filter */}
            {difficulties.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Difficulty</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={difficulty === undefined ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(undefined)}
                  >
                    All
                  </Button>
                  {difficulties.map((d) => (
                    <Button
                      key={d}
                      variant={difficulty === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDifficulty(d)}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Mode Filter */}
            {modes.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Mode</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={mode === undefined ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode(undefined)}
                  >
                    All
                  </Button>
                  {modes.map((m) => (
                    <Button
                      key={m}
                      variant={mode === m ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMode(m)}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : scores && scores.length > 0 ? (
              <div className="divide-y">
                {scores.map((score, index) => (
                  <LeaderboardRow
                    key={score.event.id}
                    rank={index + 1}
                    score={score}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scores yet. Be the first to play!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface LeaderboardRowProps {
  rank: number;
  score: {
    event: {
      id: string;
      pubkey: string;
      created_at: number;
      kind: number;
      tags: string[][];
      content: string;
      sig: string;
    };
    score: number;
    playerPubkey: string;
    level?: string;
    difficulty?: string;
    mode?: string;
    duration?: number;
    achievements?: string[];
  };
}

function LeaderboardRow({ rank, score }: LeaderboardRowProps) {
  const author = useAuthor(score.playerPubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(score.playerPubkey);

  const getRankIcon = () => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
      <Link
        to={`/score/${score.event.id}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        {/* Rank */}
        <div className="flex items-center justify-center w-10">
          {getRankIcon()}
        </div>

        {/* Player Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar>
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate group-hover:text-primary transition-colors">
              {displayName}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(score.event.created_at * 1000, { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Score Details */}
        <div className="text-right">
          <p className="text-2xl font-bold">{score.score.toLocaleString()}</p>
          {score.duration && (
            <p className="text-xs text-muted-foreground">
              {Math.floor(score.duration / 60)}m {score.duration % 60}s
            </p>
          )}
        </div>
      </Link>

      {/* Zap Button - separate from the Link */}
      <div className="flex items-center">
        <ScoreZapButton
          scoreEvent={score.event as unknown as Event}
          playerPubkey={score.playerPubkey}
          showCount={true}
        />
      </div>
    </div>
  );
}
