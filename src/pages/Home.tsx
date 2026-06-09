import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { GamesGrid } from '@/components/GamesGrid';
import { useGamesWithScores, useLatestScores, type ParsedScore } from '@/hooks/useScores';
import { useGameConfig } from '@/hooks/useGameConfig';
import { useAppContext } from '@/hooks/useAppContext';
import { useTheme } from '@/hooks/useTheme';
import { useAuthor } from '@/hooks/useAuthor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Gamepad2, Flame, Sparkles, Star, Activity, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { GAME_GENRES, isNoPubkeyGame, getNoPubkeyGames, getAllKind5555Games, getAllGames, NO_PUBKEY_PREFIX, FALLBACK_GAME_METADATA, formatScoreValue, getScoreDisplayPrefs, resolveGameByIdentifier, type GameConfigMap, type GameMetadata } from '@/lib/gameConfig';
import { genUserName } from '@/lib/genUserName';

type FilterMode = 'all' | 'featured' | 'trending' | 'new';

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const { data: gamesWithScores, isLoading } = useGamesWithScores({ limit: 1000 });
  const { config, getGame, getFeatured, getTrending, getNewReleases } = useGameConfig();
  const { config: appConfig } = useAppContext();
  const [visibleLatestScoresCount, setVisibleLatestScoresCount] = useState(appConfig.latestScoresCount);
  const latestScoresQueryLimit = visibleLatestScoresCount + appConfig.latestScoresBufferCount;
  const { data: latestScores, isLoading: isLatestScoresLoading } = useLatestScores({ limit: latestScoresQueryLimit });
  const { theme } = useTheme();
  const logoSrc = theme === 'light' ? '/gamestr-logo-light.svg' : '/gamestr-logo-dark.svg';

  useEffect(() => {
    setVisibleLatestScoresCount(appConfig.latestScoresCount);
  }, [appConfig.latestScoresCount]);

  const noPubkeyConfigGames = useMemo(() => getNoPubkeyGames(), []);
  const kind5555ConfigGames = useMemo(() => getAllKind5555Games(), []);
  const allConfigGames = useMemo(() => getAllGames(), []);

  const games = useMemo(() => {
    const nostrGames = (gamesWithScores || []).map(game => ({
      pubkey: game.developerPubkey,
      gameIdentifier: game.gameIdentifier,
      metadata: getGame(game.developerPubkey, game.gameIdentifier),
      scoreCount: game.scoreCount,
      topScore: game.topScore,
    }));

    const nostrGameIdentifiers = new Set(nostrGames.map(g => g.gameIdentifier));

    const noPubkeyGames = noPubkeyConfigGames
      .filter(g => !nostrGameIdentifiers.has(g.gameIdentifier))
      .map(g => ({
        pubkey: g.pubkey,
        gameIdentifier: g.gameIdentifier,
        metadata: g.metadata,
        scoreCount: undefined as number | undefined,
        topScore: undefined as number | undefined,
      }));

    const kind5555Fallbacks = kind5555ConfigGames
      .filter(g => !nostrGameIdentifiers.has(g.gameTag))
      .map(g => ({
        pubkey: NO_PUBKEY_PREFIX,
        gameIdentifier: g.gameTag,
        metadata: g.config.metadata,
        scoreCount: undefined as number | undefined,
        topScore: undefined as number | undefined,
      }));

    const nostrGameKeys = new Set(nostrGames.map(g => `${g.pubkey}:${g.gameIdentifier}`));
    const configOnlyGames = allConfigGames
      .filter(g => !isNoPubkeyGame(g.pubkey) && !nostrGameKeys.has(`${g.pubkey}:${g.gameIdentifier}`))
      .map(g => ({
        pubkey: g.pubkey,
        gameIdentifier: g.gameIdentifier,
        metadata: g.metadata,
        scoreCount: undefined as number | undefined,
        topScore: undefined as number | undefined,
      }));

    return [...nostrGames, ...noPubkeyGames, ...kind5555Fallbacks, ...configOnlyGames];
  }, [gamesWithScores, getGame, noPubkeyConfigGames, kind5555ConfigGames, allConfigGames]);

  // Apply filters
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Apply filter mode
    if (filterMode === 'featured') {
      const featuredKeys = new Set(
        getFeatured().map(g => `${g.pubkey}:${g.gameIdentifier}`)
      );
      filtered = filtered.filter(game =>
        featuredKeys.has(`${game.pubkey}:${game.gameIdentifier}`)
      );
    } else if (filterMode === 'trending') {
      const trendingKeys = new Set(
        getTrending().map(g => `${g.pubkey}:${g.gameIdentifier}`)
      );
      filtered = filtered.filter(game =>
        trendingKeys.has(`${game.pubkey}:${game.gameIdentifier}`)
      );
    } else if (filterMode === 'new') {
      const newKeys = new Set(
        getNewReleases().map(g => `${g.pubkey}:${g.gameIdentifier}`)
      );
      filtered = filtered.filter(game =>
        newKeys.has(`${game.pubkey}:${game.gameIdentifier}`)
      );
    }

    // Apply genre filter
    if (selectedGenre) {
      filtered = filtered.filter(game =>
        game.metadata.genres.includes(selectedGenre)
      );
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(game =>
        game.metadata.name.toLowerCase().includes(query) ||
        game.metadata.description.toLowerCase().includes(query) ||
        game.metadata.genres.some(g => g.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [games, filterMode, selectedGenre, searchQuery, getFeatured, getTrending, getNewReleases]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Header */}
      <div
        className="relative overflow-hidden text-white"
        style={{
          backgroundColor: "#0a0a1a",
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,255,128,0.07) 31px, rgba(0,255,128,0.07) 32px),
            repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(0,255,128,0.07) 31px, rgba(0,255,128,0.07) 32px)
          `,
        }}
      >
        {/* scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 4px)",
          }}
        />
        {/* neon glow spots */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-green-400/10 blur-2xl" />
          <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-cyan-400/10 blur-2xl" />
        </div>

        <div className="relative container mx-auto px-4 pt-6 pb-4">
          <div className="max-w-3xl mx-auto text-center">
            <img src={logoSrc} alt="Gamestr" className="h-64 md:h-96 mx-auto drop-shadow-[0_0_32px_rgba(168,85,247,0.6)]" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Filters Section */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search games by name, description, or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center">
            <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
              <TabsList className="grid grid-cols-4 w-full max-w-md">
                <TabsTrigger value="all" className="gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  All Games
                </TabsTrigger>
                <TabsTrigger value="featured" className="gap-2">
                  <Star className="h-4 w-4" />
                  Featured
                </TabsTrigger>
                <TabsTrigger value="trending" className="gap-2">
                  <Flame className="h-4 w-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  New
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Genre Pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant={selectedGenre === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGenre(null)}
            >
              All Genres
            </Button>
            {GAME_GENRES.filter(g => g !== 'uncategorized').map((genre) => (
              <Button
                key={genre}
                variant={selectedGenre === genre ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedGenre(genre)}
              >
                {genre}
              </Button>
            ))}
          </div>

          {/* Active Filters Display */}
          {(selectedGenre || searchQuery || filterMode !== 'all') && (
            <div className="flex flex-wrap gap-2 justify-center items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filterMode !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {filterMode === 'featured' && <Star className="h-3 w-3" />}
                  {filterMode === 'trending' && <Flame className="h-3 w-3" />}
                  {filterMode === 'new' && <Sparkles className="h-3 w-3" />}
                  {filterMode}
                </Badge>
              )}
              {selectedGenre && (
                <Badge variant="secondary">{selectedGenre}</Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary">"{searchQuery}"</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterMode('all');
                  setSelectedGenre(null);
                  setSearchQuery('');
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        <LatestScoresSection
          scores={(latestScores || []).slice(0, visibleLatestScoresCount)}
          gameConfig={config}
          hasMoreScores={(latestScores?.length ?? 0) > visibleLatestScoresCount}
          isLoading={isLatestScoresLoading}
          onLoadMore={() => setVisibleLatestScoresCount(count => count + appConfig.latestScoresCount)}
        />

        {/* Results Count */}
        {!isLoading && (
          <div className="text-center text-muted-foreground">
            Showing {filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'}
          </div>
        )}

        {/* Games Grid */}
        <GamesGrid
          games={filteredGames}
          isLoading={isLoading}
          emptyMessage="No games match your filters. Try adjusting your search or filters."
        />
      </div>

      {/* Footer CTA */}
      <div className="mt-16 py-12 bg-muted/50">
        <div className="container mx-auto px-4 text-center space-y-4">
          <h2 className="text-2xl font-bold">Are you a game developer?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Learn how to integrate Gamestr into your games and reach players on the decentralized web.
          </p>
          <Button size="lg" asChild>
            <a href="/developers">View Developer Guide</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface LatestScoresSectionProps {
  scores: ParsedScore[];
  gameConfig: GameConfigMap;
  hasMoreScores: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

function LatestScoresSection({ scores, gameConfig, hasMoreScores, isLoading, onLoadMore }: LatestScoresSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const row = scrollRef.current;
    if (!row) return;

    const updateScrollState = () => {
      setCanScrollLeft(row.scrollLeft > 0);
      setCanScrollRight(hasMoreScores || row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
    };

    updateScrollState();
    row.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      row.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [hasMoreScores, isLoading, scores.length]);

  const scrollScores = (direction: 'left' | 'right') => {
    const row = scrollRef.current;
    if (!row) return;

    const isAtEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
    if (direction === 'right' && isAtEnd && hasMoreScores) {
      onLoadMore();
      window.requestAnimationFrame(() => {
        row.scrollBy({ left: row.clientWidth * 0.85, behavior: 'smooth' });
      });
      return;
    }

    row.scrollBy({
      left: direction === 'left' ? -row.clientWidth * 0.85 : row.clientWidth * 0.85,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative overflow-visible rounded-3xl border bg-card/80 p-5 shadow-lg shadow-primary/5 sm:p-6">
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_30%)]" />
      </div>
      <div className="relative space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-2 gap-1 border-primary/30 bg-primary/10 text-primary">
              <Activity className="h-3 w-3" />
              Live feed
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Latest Scores</h2>
            <p className="text-sm text-muted-foreground">Fresh runs arriving from Nostr leaderboards.</p>
          </div>
          <Button variant="outline" size="sm" asChild className="w-fit gap-2 rounded-full bg-background/70">
            <Link to="/scores">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading || scores.length > 0 ? (
          <div className="relative py-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Scroll latest scores left"
              disabled={!canScrollLeft}
              onClick={() => scrollScores('left')}
              className="absolute left-0 top-1/2 z-10 h-10 w-10 -translate-x-3 -translate-y-1/2 rounded-full border bg-background/90 shadow-lg backdrop-blur transition-opacity disabled:opacity-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div
              ref={scrollRef}
              className="-my-4 flex gap-3 overflow-x-auto py-4 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <Card key={index} className="min-w-[240px] flex-1 snap-start bg-background/70 md:min-w-[280px]">
                      <CardHeader className="space-y-3 pb-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-5 w-3/4" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-4 w-full" />
                      </CardContent>
                    </Card>
                  ))
                : scores.map((score) => (
                    <LatestScoreCard key={score.event.id} score={score} gameConfig={gameConfig} />
                  ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Scroll latest scores right"
              disabled={!canScrollRight}
              onClick={() => scrollScores('right')}
              className="absolute right-0 top-1/2 z-10 h-10 w-10 translate-x-3 -translate-y-1/2 rounded-full border bg-background/90 shadow-lg backdrop-blur transition-opacity disabled:opacity-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Card className="border-dashed bg-background/70">
            <CardContent className="py-8 text-center text-muted-foreground">
              No recent scores found. Try another relay or check back soon.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

interface LatestScoreCardProps {
  score: ParsedScore;
  gameConfig: GameConfigMap;
}

function LatestScoreCard({ score, gameConfig }: LatestScoreCardProps) {
  const author = useAuthor(score.playerPubkey);
  const metadata = author.data?.metadata;
  const playerName = metadata?.name || metadata?.display_name || genUserName(score.playerPubkey);
  const resolvedGame = resolveGameByIdentifier(score.gameIdentifier, gameConfig);
  const gameMetadata: GameMetadata = resolvedGame?.metadata || FALLBACK_GAME_METADATA;
  const scorePrefs = getScoreDisplayPrefs(gameMetadata);

  return (
    <Link to={`/${score.gameIdentifier}/score/${score.event.id}`} className="group block min-w-[240px] flex-1 snap-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:min-w-[280px]">
      <Card className="h-full overflow-hidden bg-background/75 transition-all group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/10">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={metadata?.picture} alt={playerName} />
              <AvatarFallback>{playerName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Badge variant="secondary" className="max-w-36 rounded-full px-3 py-1 text-xs font-semibold">
              <span className="truncate">{gameMetadata.name}</span>
            </Badge>
          </div>
          <CardTitle className="line-clamp-1 text-base">{playerName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-3xl font-black tracking-tight text-primary">{formatScoreValue(score.score, scorePrefs)}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(score.event.created_at * 1000, { addSuffix: true })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
