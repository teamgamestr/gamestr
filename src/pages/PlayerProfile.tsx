import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlayerScores, type LeaderboardPeriod } from '@/hooks/useScores';
import { useGameConfig } from '@/hooks/useGameConfig';
import { useAuthor } from '@/hooks/useAuthor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Target, Gamepad2, TrendingUp, ExternalLink } from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';

export function PlayerProfile() {
  const { pubkey } = useParams<{ pubkey: string }>();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');

  const author = useAuthor(pubkey || '');
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey || '');

  const { data: scores, isLoading } = usePlayerScores(pubkey || '', {
    period,
    limit: 500,
  });

  const { getGame } = useGameConfig();

  // Group scores by game
  const gameStats = useMemo(() => {
    if (!scores) return [];

    const gamesMap = new Map<string, {
      gameKey: string;
      pubkey: string;
      gameIdentifier: string;
      scores: typeof scores;
      topScore: number;
      totalScores: number;
      averageScore: number;
      latestTimestamp: number;
    }>();

    scores.forEach(score => {
      const key = `${score.event.pubkey}:${score.gameIdentifier}`;
      const existing = gamesMap.get(key);

      if (existing) {
        existing.scores.push(score);
        existing.topScore = Math.max(existing.topScore, score.score);
        existing.totalScores++;
        existing.latestTimestamp = Math.max(existing.latestTimestamp, score.event.created_at);
      } else {
        gamesMap.set(key, {
          gameKey: key,
          pubkey: score.event.pubkey,
          gameIdentifier: score.gameIdentifier,
          scores: [score],
          topScore: score.score,
          totalScores: 1,
          averageScore: score.score,
          latestTimestamp: score.event.created_at,
        });
      }
    });

    // Calculate averages
    gamesMap.forEach(game => {
      const sum = game.scores.reduce((acc, s) => acc + s.score, 0);
      game.averageScore = Math.round(sum / game.scores.length);
    });

    return Array.from(gamesMap.values())
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [scores]);

  // Calculate overall stats
  const totalGames = gameStats.length;
  const totalScores = scores?.length || 0;
  const topScore = scores && scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0;
  const uniqueAchievements = new Set(
    scores?.flatMap(s => s.achievements || [])
  ).size;

  if (!pubkey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Player not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="text-3xl">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold">{displayName}</h1>
              {metadata?.about && (
                <p className="text-muted-foreground max-w-2xl">{metadata.about}</p>
              )}
              {metadata?.nip05 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4" />
                  {metadata.nip05}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/">Back to Games</Link>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-1">
                  <Gamepad2 className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-2xl font-bold">{totalGames}</p>
                  <p className="text-sm text-muted-foreground">Games Played</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-1">
                  <Target className="h-8 w-8 mx-auto text-blue-500" />
                  <p className="text-2xl font-bold">{totalScores}</p>
                  <p className="text-sm text-muted-foreground">Total Scores</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-1">
                  <Trophy className="h-8 w-8 mx-auto text-yellow-500" />
                  <p className="text-2xl font-bold">{topScore.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Best Score</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-1">
                  <TrendingUp className="h-8 w-8 mx-auto text-green-500" />
                  <p className="text-2xl font-bold">{uniqueAchievements}</p>
                  <p className="text-sm text-muted-foreground">Achievements</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Time Period Filter */}
        <div className="flex justify-center">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="all-time">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Games List */}
        <Card>
          <CardHeader>
            <CardTitle>Games & Scores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : gameStats.length > 0 ? (
              <div className="space-y-4">
                {gameStats.map((game) => {
                  const metadata = getGame(game.pubkey, game.gameIdentifier);
                  return (
                    <Link
                      key={game.gameKey}
                      to={`/game/${game.pubkey}/${game.gameIdentifier}`}
                      className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {/* Game Image */}
                      <div className="h-16 w-16 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={metadata.image}
                          alt={metadata.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Game Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{metadata.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{game.totalScores} scores</span>
                          <span>•</span>
                          <span>Avg: {game.averageScore.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Top Score */}
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-xl font-bold">
                            {game.topScore.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(game.latestTimestamp * 1000, { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scores found for this time period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scores */}
        {scores && scores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scores.slice(0, 10).map((score) => {
                  const metadata = getGame(score.event.pubkey, score.gameIdentifier);
                  return (
                    <div
                      key={score.event.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded overflow-hidden bg-background flex-shrink-0">
                          <img
                            src={metadata.image}
                            alt={metadata.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{metadata.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(score.event.created_at * 1000, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {score.difficulty && (
                          <Badge variant="outline" className="hidden sm:inline-flex">
                            {score.difficulty}
                          </Badge>
                        )}
                        <span className="text-lg font-bold">
                          {score.score.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
