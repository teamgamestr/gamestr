import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { filterTestEvents } from '@/lib/testData';
import { EXCLUDED_GAMES, KIND_5555_GAMES, getKind5555Config, isKind5555Game, type ScoreDirection } from '@/lib/gameConfig';

export interface ScoreEvent extends NostrEvent {
  kind: number;
}

export interface ParsedScore {
  event: ScoreEvent;
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
  sourceKind?: number;
}

export function validateScoreEvent(event: NostrEvent): ParsedScore | null {
  if (event.kind === 30762) {
    return validateKind30762(event);
  }
  if (event.kind === 5555) {
    return validateKind5555(event);
  }
  return null;
}

function validateKind30762(event: NostrEvent): ParsedScore | null {
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
    event: event as ScoreEvent,
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
    sourceKind: 30762,
  };
}

function validateKind5555(event: NostrEvent): ParsedScore | null {
  let gameTag = event.tags.find(([name]) => name === 'game')?.[1];
  if (!gameTag) {
    const tTags = event.tags.filter(([name]) => name === 't').map(([, v]) => v);
    gameTag = tTags.find(t => getKind5555Config(t));
  }
  if (!gameTag) return null;

  const config = getKind5555Config(gameTag);
  if (!config) return null;

  const scoreTag = event.tags.find(([name]) => name === config.scoreField)?.[1];
  if (!scoreTag) return null;

  const score = parseInt(scoreTag);
  if (isNaN(score)) return null;

  const difficultyTag = event.tags.find(([name]) => name === 'difficulty')?.[1];
  const modeTag = event.tags.find(([name]) => name === 'mode')?.[1];
  const versionTag = event.tags.find(([name]) => name === 'version')?.[1];
  const genreTags = event.tags.filter(([name]) => name === 't').map(([, value]) => value);

  return {
    event: event as ScoreEvent,
    gameIdentifier: gameTag,
    score,
    playerPubkey: event.pubkey,
    difficulty: difficultyTag,
    mode: modeTag,
    version: versionTag,
    genres: genreTags.length > 0 ? genreTags : undefined,
    sourceKind: 5555,
  };
}

export function getScoreDirection(gameIdentifier: string): ScoreDirection {
  const config = getKind5555Config(gameIdentifier);
  return config?.scoreDirection || 'desc';
}

function sortScores(scores: ParsedScore[], direction: ScoreDirection): ParsedScore[] {
  if (direction === 'asc') {
    return scores.sort((a, b) => a.score - b.score);
  }
  return scores.sort((a, b) => b.score - a.score);
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';

/**
 * Get timestamp for leaderboard period
 */
function getPeriodTimestamp(period: LeaderboardPeriod): number | undefined {
  const now = Math.floor(Date.now() / 1000);
  
  switch (period) {
    case 'daily':
      return now - 86400; // 24 hours
    case 'weekly':
      return now - 604800; // 7 days
    case 'monthly':
      return now - 2592000; // 30 days
    case 'all-time':
      return undefined; // No time filter
  }
}

interface UseScoresOptions {
  gameIdentifier?: string;
  playerPubkey?: string;
  difficulty?: string;
  mode?: string;
  genre?: string;
  period?: LeaderboardPeriod;
  limit?: number;
  developerPubkey?: string;
  enabled?: boolean;
  kind5555Only?: boolean;
}

/**
 * Query score events from Nostr
 */
export function useScores(options: UseScoresOptions = {}) {
  const { nostr } = useNostr();
  const {
    gameIdentifier,
    playerPubkey,
    difficulty,
    mode,
    genre,
    period = 'all-time',
    limit = 100,
    developerPubkey,
    enabled = true,
    kind5555Only = false,
  } = options;

  return useQuery({
    queryKey: ['scores', gameIdentifier, playerPubkey, difficulty, mode, genre, period, limit, developerPubkey, kind5555Only],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const filters: NostrFilter[] = [];

      const since = getPeriodTimestamp(period);

      if (!kind5555Only) {
        const filter30762: NostrFilter = {
          kinds: [30762],
          limit: 1000,
        };
        if (since) filter30762.since = since;
        if (playerPubkey) filter30762['#p'] = [playerPubkey];
        if (genre) filter30762['#t'] = [genre];
        if (developerPubkey) filter30762.authors = [developerPubkey];
        filters.push(filter30762);
      }

      if (gameIdentifier && isKind5555Game(gameIdentifier)) {
        const filter5555: NostrFilter = {
          kinds: [5555],
          '#t': [gameIdentifier],
          limit: 1000,
        };
        if (since) filter5555.since = since;
        if (playerPubkey) filter5555.authors = [playerPubkey];
        filters.push(filter5555);
      } else if (kind5555Only) {
        const kind5555Tags = Object.keys(KIND_5555_GAMES);
        if (kind5555Tags.length > 0) {
          const filter5555: NostrFilter = {
            kinds: [5555],
            '#t': kind5555Tags,
            limit: 1000,
          };
          if (since) filter5555.since = since;
          if (playerPubkey) filter5555.authors = [playerPubkey];
          filters.push(filter5555);
        }
      }

      if (filters.length === 0) return [];

      const events = await nostr.query(filters, { signal });

      let parsedScores = events
        .map(validateScoreEvent)
        .filter((score): score is ParsedScore => score !== null)
        .filter(score => score.state !== 'invalidated');

      if (gameIdentifier) {
        parsedScores = parsedScores.filter(score => score.gameIdentifier === gameIdentifier);
      }

      if (difficulty) {
        parsedScores = parsedScores.filter(score => score.difficulty === difficulty);
      }

      if (mode) {
        parsedScores = parsedScores.filter(score => score.mode === mode);
      }

      const direction = gameIdentifier ? getScoreDirection(gameIdentifier) : 'desc';
      return sortScores(parsedScores, direction).slice(0, limit);
    },
    enabled,
  });
}

/**
 * Get leaderboard for a specific game
 */
export function useLeaderboard(
  gameIdentifier: string,
  period: LeaderboardPeriod = 'all-time',
  options: {
    difficulty?: string;
    mode?: string;
    limit?: number;
    developerPubkey?: string;
  } = {}
) {
  return useScores({
    gameIdentifier,
    period,
    ...options,
  });
}

/**
 * Get scores for a specific player
 */
export function usePlayerScores(
  playerPubkey: string,
  options: {
    gameIdentifier?: string;
    period?: LeaderboardPeriod;
    limit?: number;
  } = {}
) {
  return useScores({
    playerPubkey,
    ...options,
  });
}

/**
 * Get all games with scores
 */
export function useGamesWithScores(options: { limit?: number; includeTestData?: boolean } = {}) {
  const { nostr } = useNostr();
  const { limit = 500, includeTestData = false } = options;

  return useQuery({
    queryKey: ['games-with-scores', limit, includeTestData],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      let events: NostrEvent[] = [];
      
      try {
        const filters: NostrFilter[] = [
          { kinds: [30762], limit },
        ];

        const kind5555Tags = Object.keys(KIND_5555_GAMES);
        if (kind5555Tags.length > 0) {
          filters.push({
            kinds: [5555],
            '#t': kind5555Tags,
            limit,
          });
        }

        events = await nostr.query(filters, { signal });
      } catch (error) {
        console.warn('Failed to fetch scores from relays, using test data only', error);
      }

      if (includeTestData) {
        const { ALL_TEST_SCORES } = await import('@/lib/testData');
        events = [...events, ...ALL_TEST_SCORES];
      } else {
        events = filterTestEvents(events);
      }

      const parsedScores = events
        .map(validateScoreEvent)
        .filter((score): score is ParsedScore => score !== null);

      const gamesMap = new Map<string, {
        gameIdentifier: string;
        developerPubkey: string;
        scoreCount: number;
        topScore: number;
        latestTimestamp: number;
        genres: Set<string>;
        sourceKind: number;
      }>();

      parsedScores.forEach(score => {
        const key = score.gameIdentifier;
        const existing = gamesMap.get(key);

        if (existing) {
          existing.scoreCount++;
          const direction = getScoreDirection(score.gameIdentifier);
          if (direction === 'asc') {
            existing.topScore = Math.min(existing.topScore, score.score);
          } else {
            existing.topScore = Math.max(existing.topScore, score.score);
          }
          existing.latestTimestamp = Math.max(existing.latestTimestamp, score.event.created_at);
          if (score.genres) {
            score.genres.forEach(g => existing.genres.add(g));
          }
        } else {
          const isK5555 = score.sourceKind === 5555;
          const devPubkey = isK5555 ? `nopubkey` : score.event.pubkey;
          gamesMap.set(key, {
            gameIdentifier: score.gameIdentifier,
            developerPubkey: devPubkey,
            scoreCount: 1,
            topScore: score.score,
            latestTimestamp: score.event.created_at,
            genres: new Set(score.genres || []),
            sourceKind: score.sourceKind || 30762,
          });
        }
      });

      const excludedSet = new Set(EXCLUDED_GAMES);
      return Array.from(gamesMap.values())
        .filter(game => !excludedSet.has(`${game.developerPubkey}:${game.gameIdentifier}`) && !excludedSet.has(game.gameIdentifier))
        .map(game => ({
          ...game,
          genres: Array.from(game.genres),
        }))
        .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
    },
  });
}

/**
 * Get trending games based on recent score activity
 */
export function useTrendingGames(options: { limit?: number; days?: number } = {}) {
  const { nostr } = useNostr();
  const { limit = 100, days = 7 } = options;

  return useQuery({
    queryKey: ['trending-games', limit, days],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const since = Math.floor(Date.now() / 1000) - (days * 86400);
      
      const filters: NostrFilter[] = [
        { kinds: [30762], since, limit: 1000 },
      ];

      const kind5555Tags = Object.keys(KIND_5555_GAMES);
      if (kind5555Tags.length > 0) {
        filters.push({
          kinds: [5555],
          '#t': kind5555Tags,
          since,
          limit: 1000,
        });
      }

      const events = await nostr.query(filters, { signal });

      const parsedScores = events
        .map(validateScoreEvent)
        .filter((score): score is ParsedScore => score !== null);

      const gamesMap = new Map<string, {
        gameIdentifier: string;
        developerPubkey: string;
        scoreCount: number;
        uniquePlayers: Set<string>;
      }>();

      parsedScores.forEach(score => {
        const key = score.gameIdentifier;
        const existing = gamesMap.get(key);

        if (existing) {
          existing.scoreCount++;
          existing.uniquePlayers.add(score.playerPubkey);
        } else {
          const isK5555 = score.sourceKind === 5555;
          const devPubkey = isK5555 ? 'nopubkey' : score.event.pubkey;
          gamesMap.set(key, {
            gameIdentifier: score.gameIdentifier,
            developerPubkey: devPubkey,
            scoreCount: 1,
            uniquePlayers: new Set([score.playerPubkey]),
          });
        }
      });

      return Array.from(gamesMap.values())
        .map(game => ({
          gameIdentifier: game.gameIdentifier,
          developerPubkey: game.developerPubkey,
          scoreCount: game.scoreCount,
          playerCount: game.uniquePlayers.size,
          trendingScore: game.scoreCount * game.uniquePlayers.size,
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);
    },
  });
}
