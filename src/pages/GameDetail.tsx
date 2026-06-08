import { useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { type LeaderboardPeriod, type ParsedScore, useLeaderboard, useMultiLeaderboard } from '@/hooks/useScores';
import { useGameConfig } from '@/hooks/useGameConfig';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDMContext } from '@/contexts/DMContext';
import { MESSAGE_PROTOCOL } from '@/lib/dmConstants';
import { ZapButton } from '@/components/ZapButton';
import { useToast } from '@/hooks/useToast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ExternalLink, Trophy, Medal, Award, Clock, Target, User, MessageCircle, ShieldCheck, Flag, CheckCircle2 } from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
import { ScoreZapButton } from '@/components/ScoreZapButton';

import { formatDistanceToNow } from 'date-fns';
import type { Event } from 'nostr-tools';
import { nip19 } from 'nostr-tools';
import { isNoPubkeyGame, isKind5555Game, resolveGameByIdentifier, resolveLeaderboards, formatScoreValue, FALLBACK_GAME_METADATA, type LeaderboardConfig } from '@/lib/gameConfig';

const GAMESTR_PUBKEY = '5748fbe6ec0443e1f85b66351fe9cc2717014cf938acc968e7b20c9099802453';

export function GameDetail() {
  const { slug: gameIdentifier } = useParams<{ slug: string }>();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const [mode, setMode] = useState<string | undefined>();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const { user } = useCurrentUser();
  const { sendMessage } = useDMContext();
  const { toast } = useToast();

  const { getGame, config } = useGameConfig();
  const resolved = gameIdentifier ? resolveGameByIdentifier(gameIdentifier, config) : null;
  const isUnknownGame = !resolved;
  const pubkey = resolved?.pubkey;
  const metadata = resolved?.metadata || (gameIdentifier ? FALLBACK_GAME_METADATA : null);
  const isNoPubkey = pubkey ? isNoPubkeyGame(pubkey) : false;
  const isK5555 = gameIdentifier ? isKind5555Game(gameIdentifier) : false;
  const isPlayerSigned = metadata?.playerSigned === true;
  const hasLeaderboard = !isNoPubkey || isK5555 || isPlayerSigned;

  const handleClaim = async () => {
    if (!user) {
      toast({ title: 'Log in first', description: 'You need to be logged in to claim a game.', variant: 'destructive' });
      return;
    }
    setIsClaiming(true);
    try {
      const message = `Hi Gamestr! I'd like to claim the game "${gameIdentifier}" and add it to the directory.\n\nGame identifier: ${gameIdentifier}\nPage: ${window.location.href}`;
      await sendMessage({
        recipientPubkey: GAMESTR_PUBKEY,
        content: message,
        protocol: MESSAGE_PROTOCOL.NIP17,
      });
      setClaimed(true);
      toast({ title: 'Claim sent!', description: "We'll be in touch to verify your game." });
    } catch {
      toast({ title: 'Failed to send', description: 'Could not send claim request. Please try again.', variant: 'destructive' });
    } finally {
      setIsClaiming(false);
    }
  };

  useSeoMeta({
    title: metadata ? `${metadata.name}${hasLeaderboard ? ' Leaderboard' : ''} - Gamestr` : 'Game - Gamestr',
    description: metadata?.description || 'View the leaderboard for this game on Gamestr.',
    ogImage: metadata?.image,
    ogTitle: metadata ? `${metadata.name}${hasLeaderboard ? ' Leaderboard' : ''}` : 'Game Leaderboard',
    ogDescription: metadata?.description || 'View the leaderboard for this game on Gamestr.',
  });
  
  const developerAuthor = useAuthor(isNoPubkey ? undefined : pubkey);
  const developerMetadata = developerAuthor.data?.metadata;
  
  // Check if metadata.developer is an npub and fetch its metadata
  const isDeveloperNpub = metadata?.developer?.startsWith('npub') ?? false;
  const developerNpubHex = isDeveloperNpub && metadata?.developer 
    ? (() => { try { return nip19.decode(metadata.developer).data as string; } catch { return undefined; } })()
    : undefined;
  const developerNpubAuthor = useAuthor(developerNpubHex);
  const developerNpubMetadata = developerNpubAuthor.data?.metadata;
  
  // Use resolved name from Nostr if available, fallback to config value
  const developerDisplayName = developerMetadata?.name 
    || developerNpubMetadata?.name 
    || metadata?.developer 
    || (isNoPubkey ? undefined : genUserName(pubkey || ''));
  const developerProfileUrl = isDeveloperNpub && metadata?.developer ? `/${metadata.developer}` : undefined;

  const resolvedLeaderboards = metadata ? resolveLeaderboards(metadata) : [];
  const isSplitLeaderboard = (metadata?.leaderboardSplit?.values?.length ?? 0) > 0;
  const splitLayout = metadata?.leaderboardSplit?.layout ?? 'tabs';
  const hasMultiLeaderboard = resolvedLeaderboards.length > 1;
  const leaderboardConfigs: LeaderboardConfig[] = resolvedLeaderboards.length > 0
    ? resolvedLeaderboards
    : [{ label: "Score", scoreTag: "score", direction: "desc" }];

  // Deep-link the selected board via the URL: ?track=<slug> for split
  // (per-level) boards, ?board=<slug> for multi-metric tabs. The slug is
  // derived from the friendly label so links are readable and shareable, and
  // browser back/forward stays in sync.
  const [searchParams, setSearchParams] = useSearchParams();
  const boardParamName = isSplitLeaderboard ? 'track' : 'board';
  const boardKeys = useMemo(
    () =>
      leaderboardConfigs.map((lb) =>
        lb.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      ),
    [leaderboardConfigs],
  );
  const activeBoard = Math.max(0, boardKeys.indexOf(searchParams.get(boardParamName) ?? ''));
  const setActiveBoard = (index: number) => {
    const next = new URLSearchParams(searchParams);
    if (index <= 0) {
      next.delete(boardParamName);
    } else {
      next.set(boardParamName, boardKeys[index]);
    }
    setSearchParams(next);
  };

  const singleLeaderboard = useLeaderboard(
    gameIdentifier || '',
    period,
    {
      difficulty,
      mode,
      developerPubkey: (isK5555 || isPlayerSigned) ? undefined : pubkey,
      limit: 100,
      enabled: hasLeaderboard && !hasMultiLeaderboard,
      kind5555Only: isK5555,
    }
  );

  const multiLeaderboard = useMultiLeaderboard(
    gameIdentifier || '',
    leaderboardConfigs,
    period,
    {
      difficulty,
      mode,
      developerPubkey: (isK5555 || isPlayerSigned) ? undefined : pubkey,
      limit: 100,
      enabled: hasLeaderboard && hasMultiLeaderboard,
      kind5555Only: isK5555,
    }
  );

  const scores = hasMultiLeaderboard
    ? multiLeaderboard.data?.[0]?.scores
    : singleLeaderboard.data;
  const isLoading = hasMultiLeaderboard ? multiLeaderboard.isLoading : singleLeaderboard.isLoading;

  const difficulties = Array.from(new Set(scores?.map(s => s.difficulty).filter(Boolean))) as string[];
  const modes = Array.from(new Set(scores?.map(s => s.mode).filter(Boolean))) as string[];

  if (!gameIdentifier || !metadata) {
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
            <div className="w-full md:w-64 aspect-square rounded-lg overflow-hidden shadow-2xl bg-gradient-to-br from-muted to-background">
              <img
                src={metadata.image}
                alt={metadata.name}
                className="w-full h-full object-contain p-2"
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

              {/* Stats — hidden for split boards: each track shows its own best
                  time in the board, and a per-tab summary here causes the page
                  to jump as you switch tracks / scores load. */}
              {hasLeaderboard && !isSplitLeaderboard && (
                <div className="flex flex-wrap gap-4 text-sm">
                  {scores && scores.length > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span>{scores.length} scores submitted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span>{isSplitLeaderboard ? 'Best Time' : 'Top Score'}: {formatScoreValue(scores[0].score, leaderboardConfigs[0])}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

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
                {hasLeaderboard && !isK5555 && pubkey && developerAuthor.data?.event && (
                  <div className="cursor-pointer">
                    <ZapButton 
                      target={developerAuthor.data.event as unknown as Event}
                      showCount={true}
                      className="h-11 px-6 text-base font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    />
                  </div>
                )}
                {/* Server/Game Developer Button - "From xxx" */}
                {pubkey && !isNoPubkey && (() => {
                  const isValidHex = /^[0-9a-f]{64}$/i.test(pubkey);
                  const profileUrl = isValidHex ? `/${nip19.npubEncode(pubkey)}` : `/player/${pubkey}`;
                  const displayName = developerMetadata?.name || genUserName(pubkey);
                  
                  return (
                    <Button variant="outline" size="lg" asChild>
                      <Link to={profileUrl}>
                        <User className="mr-2 h-4 w-4" />
                        From {displayName}
                      </Link>
                    </Button>
                  );
                })()}
                
                {/* Game Metadata Developer Button - "By xxx" */}
                {isDeveloperNpub && developerProfileUrl && (
                  <Button variant="outline" size="lg" asChild>
                    <Link to={developerProfileUrl}>
                      <User className="mr-2 h-4 w-4" />
                      By {developerNpubMetadata?.name || (developerNpubHex ? genUserName(developerNpubHex) : metadata?.developer)}
                    </Link>
                  </Button>
                )}
                {metadata?.developer && !isDeveloperNpub && (
                  <Badge variant="secondary" className="text-base px-4 py-2">
                    By {metadata.developer}
                  </Badge>
                )}

                {/* Claim this game — only for unknown games */}
                {isUnknownGame && (
                  claimed ? (
                    <Button variant="outline" size="lg" disabled className="gap-2 text-green-500 border-green-500/40">
                      <CheckCircle2 className="h-4 w-4" />
                      Claim Sent
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2"
                      onClick={handleClaim}
                      disabled={isClaiming}
                    >
                      <Flag className="h-4 w-4" />
                      {isClaiming ? 'Sending…' : 'Claim this game'}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {!hasLeaderboard ? (
          <Card>
            <CardContent className="py-16 text-center space-y-6">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Scores not yet available</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  This game hasn't published scores to Nostr yet. Contact the game owner and encourage them to integrate with Gamestr so players can compete on a decentralized leaderboard!
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link to="/developers">
                    Learn how to integrate
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {metadata.name} Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

            {isSplitLeaderboard && splitLayout === 'tabs' ? (
              <>
                {/* Scrollable track selector */}
                <div className="-mx-1 overflow-x-auto pb-1">
                  <div className="flex gap-2 px-1 w-max">
                    {leaderboardConfigs.map((lb, i) => (
                      <Button
                        key={i}
                        variant={activeBoard === i ? 'default' : 'outline'}
                        size="sm"
                        className="whitespace-nowrap shrink-0"
                        onClick={() => setActiveBoard(i)}
                      >
                        {lb.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <LeaderboardPanel
                    boardData={multiLeaderboard.data?.[activeBoard]}
                    isLoading={multiLeaderboard.isLoading}
                    developerPubkey={pubkey}
                    gameIdentifier={gameIdentifier}
                  />
                </div>
              </>
            ) : hasMultiLeaderboard ? (
              <>
                <div className="md:hidden">
                  <Tabs value={String(activeBoard)} onValueChange={(v) => setActiveBoard(Number(v))}>
                    <TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${leaderboardConfigs.length}, 1fr)` }}>
                      {leaderboardConfigs.map((lb, i) => (
                        <TabsTrigger key={i} value={String(i)}>{lb.label}</TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="mt-4">
                    <LeaderboardPanel
                      boardData={multiLeaderboard.data?.[activeBoard]}
                      isLoading={multiLeaderboard.isLoading}
                      developerPubkey={pubkey}
                      gameIdentifier={gameIdentifier}
                    />
                  </div>
                </div>
                <div className="hidden md:grid gap-6" style={{ gridTemplateColumns: `repeat(${leaderboardConfigs.length}, 1fr)` }}>
                  {leaderboardConfigs.map((_, i) => (
                    <LeaderboardPanel
                      key={i}
                      boardData={multiLeaderboard.data?.[i]}
                      isLoading={multiLeaderboard.isLoading}
                      developerPubkey={pubkey}
                      gameIdentifier={gameIdentifier}
                    />
                  ))}
                </div>
              </>
            ) : (
              <LeaderboardPanel
                boardData={scores ? { config: leaderboardConfigs[0], scores } : undefined}
                isLoading={isLoading}
                developerPubkey={pubkey}
                gameIdentifier={gameIdentifier}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface LeaderboardPanelProps {
  boardData?: { config: LeaderboardConfig; scores: ParsedScore[] };
  isLoading: boolean;
  developerPubkey?: string;
  gameIdentifier?: string;
}

function LeaderboardPanel({ boardData, isLoading, developerPubkey, gameIdentifier }: LeaderboardPanelProps) {
  const config = boardData?.config;
  const scores = boardData?.scores;

  return (
    <Card>
      {config && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            {config.label}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
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
                config={config}
                developerPubkey={developerPubkey}
                gameIdentifier={gameIdentifier}
                showDisplayValue={!!config?.displayTag}
                displayLabel={config?.displayLabel}
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
  );
}

interface LeaderboardRowProps {
  rank: number;
  score: ParsedScore;
  config?: LeaderboardConfig;
  developerPubkey?: string;
  gameIdentifier?: string;
  showDisplayValue?: boolean;
  displayLabel?: string;
}

function LeaderboardRow({ rank, score, config, developerPubkey, gameIdentifier, showDisplayValue, displayLabel }: LeaderboardRowProps) {
  const author = useAuthor(score.playerPubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(score.playerPubkey);
  const isVerified = developerPubkey && score.event.pubkey === developerPubkey;

  const getRankIcon = () => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
      <Link
        to={`/${gameIdentifier}/score/${score.event.id}`}
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
            <div className="flex items-center gap-1.5">
              <p className="font-medium truncate group-hover:text-primary transition-colors">
                {displayName}
              </p>
              {isVerified && (
                <span title="Verified: signed by game developer">
                  <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(score.event.created_at * 1000, { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Score Details */}
        <div className="text-right">
          <p className="text-2xl font-bold">{formatScoreValue(score.score, config)}</p>
          {showDisplayValue && score.displayValue && (
            <p className="text-xs text-muted-foreground">
              {displayLabel ? `${displayLabel}: ` : ''}{score.displayValue}
            </p>
          )}
          {!showDisplayValue && config?.scoreFormat !== 'time' && score.duration && (
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
