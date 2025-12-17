import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { filterTestEvents } from '@/lib/testData';
import { EXCLUDED_GAMES } from '@/lib/gameConfig';

export interface ScoreEvent extends NostrEvent {
  kind: 30762;
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
}

/**
 * Validate and parse a score event
 */
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
  };
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
  } = options;

  return useQuery({
    queryKey: ['scores', gameIdentifier, playerPubkey, difficulty, mode, genre, period, limit, developerPubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const filter: NostrFilter = {
        kinds: [30762],
        limit: 1000, // Fetch more events since we'll filter in JS
      };

      // Add time filter for period
      const since = getPeriodTimestamp(period);
      if (since) {
        filter.since = since;
      }

      // Only add filters that relays can actually index
      // Relays only index single-letter tags and special fields like 'authors'
      
      // Add player filter (p is a single-letter tag)
      if (playerPubkey) {
        filter['#p'] = [playerPubkey];
      }

      // Add genre filter (t is a single-letter tag)
      if (genre) {
        filter['#t'] = [genre];
      }

      // Add developer filter
      if (developerPubkey) {
        filter.authors = [developerPubkey];
      }

      const events = await nostr.query([filter], { signal });

      // Validate and parse events
      let parsedScores = events
        .map(validateScoreEvent)
        .filter((score): score is ParsedScore => score !== null)
        .filter(score => score.state !== 'invalidated'); // Filter out invalidated scores

      // Filter by game identifier in JavaScript
      if (gameIdentifier) {
        parsedScores = parsedScores.filter(score => score.gameIdentifier === gameIdentifier);
      }

      // Filter by difficulty in JavaScript
      if (difficulty) {
        parsedScores = parsedScores.filter(score => score.difficulty === difficulty);
      }

      // Filter by mode in JavaScript
      if (mode) {
        parsedScores = parsedScores.filter(score => score.mode === mode);
      }

      // Sort by score descending and limit results
      return parsedScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
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
      
      // Try to fetch from relays, but don't fail if it times out
      try {
        events = await nostr.query([{
          kinds: [30762],
          limit,
        }], { signal });
      } catch (error) {
        console.warn('Failed to fetch scores from relays, using test data only', error);
      }

      // Handle test data based on toggle
      if (includeTestData) {
        const { ALL_TEST_SCORES } = await import('@/lib/testData');
        events = [...events, ...ALL_TEST_SCORES];
      } else {
        // Filter out relay events that have the test tag
        events = filterTestEvents(events);
      }

      // Parse and validate
      const parsedScores = events
        .map(validateScoreEvent)
        .filter((score): score is ParsedScore => score !== null);

      // Group by game and developer
      const gamesMap = new Map<string, {
        gameIdentifier: string;
        developerPubkey: string;
        scoreCount: number;
        topScore: number;
        latestTimestamp: number;
        genres: Set<string>;
      }>();

      parsedScores.forEach(score => {
        const key = `${score.event.pubkey}:${score.gameIdentifier}`;
        const existing = gamesMap.get(key);

        if (existing) {
          existing.scoreCount++;
          existing.topScore = Math.max(existing.topScore, score.score);
          existing.latestTimestamp = Math.max(existing.latestTimestamp, score.event.created_at);
          if (score.genres) {
            score.genres.forEach(g => existing.genres.add(g));
          }
        } else {
          gamesMap.set(key, {
            gameIdentifier: score.gameIdentifier,
            developerPubkey: score.event.pubkey,
            scoreCount: 1,
            topScore: score.score,
            latestTimestamp: score.event.created_at,
            genres: new Set(score.genres || []),
          });
        }
      });

      // Convert to array, filter excluded games, and sort by latest activity
      const excludedSet = new Set(EXCLUDED_GAMES);
      return Array.from(gamesMap.values())
        .filter(game => !excludedSet.has(`${game.developerPubkey}:${game.gameIdentifier}`))
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
      
      const events = await nostr.query([{
        kinds: [30762],
        since,
        limit: 1000,
      }], { signal });

      const parsedScores = events
        .map(validateScoreEvent)
        .filter((score): score is ParsedScore => score !== null);

      // Group by game and count activity
      const gamesMap = new Map<string, {
        gameIdentifier: string;
        developerPubkey: string;
        scoreCount: number;
        uniquePlayers: Set<string>;
      }>();

      parsedScores.forEach(score => {
        const key = `${score.event.pubkey}:${score.gameIdentifier}`;
        const existing = gamesMap.get(key);

        if (existing) {
          existing.scoreCount++;
          existing.uniquePlayers.add(score.playerPubkey);
        } else {
          gamesMap.set(key, {
            gameIdentifier: score.gameIdentifier,
            developerPubkey: score.event.pubkey,
            scoreCount: 1,
            uniquePlayers: new Set([score.playerPubkey]),
          });
        }
      });

      // Convert to array and sort by activity
      return Array.from(gamesMap.values())
        .map(game => ({
          gameIdentifier: game.gameIdentifier,
          developerPubkey: game.developerPubkey,
          scoreCount: game.scoreCount,
          playerCount: game.uniquePlayers.size,
          trendingScore: game.scoreCount * game.uniquePlayers.size, // Simple trending algorithm
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);
    },
  });
}
