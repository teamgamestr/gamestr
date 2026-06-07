import { useState, useMemo } from 'react';
import { GamesGrid } from '@/components/GamesGrid';
import { useGamesWithScores } from '@/hooks/useScores';
import { useGameConfig } from '@/hooks/useGameConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Gamepad2, Flame, Sparkles, Star } from 'lucide-react';
import { GAME_GENRES, isNoPubkeyGame, getNoPubkeyGames, isKind5555Game, getAllKind5555Games, getAllGames, NO_PUBKEY_PREFIX } from '@/lib/gameConfig';

type FilterMode = 'all' | 'featured' | 'trending' | 'new';

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const { data: gamesWithScores, isLoading } = useGamesWithScores({ limit: 1000 });
  const { getGame, getFeatured, getTrending, getNewReleases } = useGameConfig();

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
          <div className="max-w-3xl mx-auto text-center space-y-1">
            <img src="/gamestr-logo.svg" alt="Gamestr" className="h-64 md:h-96 mx-auto drop-shadow-[0_0_32px_rgba(168,85,247,0.6)]" />

            <p
              className="text-xl md:text-2xl max-w-2xl mx-auto font-mono tracking-wide -mt-16"
              style={{ color: "#00ff80", textShadow: "0 0 12px rgba(0,255,128,0.6)" }}
            >
              Decentralized gaming on Nostr
            </p>
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
