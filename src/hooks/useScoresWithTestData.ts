import { useMemo } from 'react';
import { useScores, type LeaderboardPeriod, type ScoreEvent } from './useScores';
import { ALL_TEST_SCORES, TEST_PLAYER_METADATA, isTestEvent } from '@/lib/testData';
import type { NostrEvent } from '@nostrify/nostrify';
import type { ParsedScore } from './useScores';

interface UseScoresWithTestDataOptions {
  gameIdentifier?: string;
  playerPubkey?: string;
  difficulty?: string;
  mode?: string;
  genre?: string;
  period?: LeaderboardPeriod;
  limit?: number;
  developerPubkey?: string;
  enabled?: boolean;
  includeTestData?: boolean; // New option to include test data
}

/**
 * Enhanced version of useScores that includes local test data
 * Set includeTestData to true to see test scores in development
 */
export function useScoresWithTestData(options: UseScoresWithTestDataOptions = {}) {
  const { includeTestData = true, ...scoreOptions } = options;
  
  // Get real scores from relays
  const realScoresQuery = useScores(scoreOptions);

  // Combine real scores with test data
  const combinedData = useMemo(() => {
    if (!includeTestData) {
      // Filter out relay events that have the test tag
      const realScores = realScoresQuery.data || [];
      return realScores.filter(score => !isTestEvent(score.event));
    }

    const realScores = realScoresQuery.data || [];
    
    // Filter test scores based on options
    let testScores = ALL_TEST_SCORES;

    if (scoreOptions.gameIdentifier) {
      testScores = testScores.filter(event =>
        event.tags.some(([name, value]) => name === 'game' && value === scoreOptions.gameIdentifier)
      );
    }

    if (scoreOptions.playerPubkey) {
      testScores = testScores.filter(event =>
        event.tags.some(([name, value]) => name === 'p' && value === scoreOptions.playerPubkey)
      );
    }

    if (scoreOptions.difficulty) {
      testScores = testScores.filter(event =>
        event.tags.some(([name, value]) => name === 'difficulty' && value === scoreOptions.difficulty)
      );
    }

    if (scoreOptions.mode) {
      testScores = testScores.filter(event =>
        event.tags.some(([name, value]) => name === 'mode' && value === scoreOptions.mode)
      );
    }

    if (scoreOptions.genre) {
      testScores = testScores.filter(event =>
        event.tags.some(([name, value]) => name === 't' && value === scoreOptions.genre)
      );
    }

    // Apply time period filter
    if (scoreOptions.period && scoreOptions.period !== 'all-time') {
      const now = Math.floor(Date.now() / 1000);
      let since: number;
      
      switch (scoreOptions.period) {
        case 'daily':
          since = now - 86400;
          break;
        case 'weekly':
          since = now - 604800;
          break;
        case 'monthly':
          since = now - 2592000;
          break;
        default:
          since = 0;
      }

      testScores = testScores.filter(event => event.created_at >= since);
    }

    // Parse test scores into ParsedScore format
    const parsedTestScores: ParsedScore[] = testScores.map(event => {
      const gameTag = event.tags.find(([name]) => name === 'game')?.[1] || '';
      const scoreTag = event.tags.find(([name]) => name === 'score')?.[1] || '0';
      const playerTag = event.tags.find(([name]) => name === 'p')?.[1] || '';
      const levelTag = event.tags.find(([name]) => name === 'level')?.[1];
      const difficultyTag = event.tags.find(([name]) => name === 'difficulty')?.[1];
      const modeTag = event.tags.find(([name]) => name === 'mode')?.[1];
      const durationTag = event.tags.find(([name]) => name === 'duration')?.[1];
      const achievementsTag = event.tags.find(([name]) => name === 'achievements')?.[1];
      const genreTags = event.tags.filter(([name, value]) => name === 't' && value !== 'test').map(([, value]) => value);

      return {
        event: event as unknown as ScoreEvent,
        gameIdentifier: gameTag,
        score: parseInt(scoreTag),
        playerPubkey: playerTag,
        level: levelTag,
        difficulty: difficultyTag,
        mode: modeTag,
        duration: durationTag ? parseInt(durationTag) : undefined,
        achievements: achievementsTag ? achievementsTag.split(',').map(a => a.trim()) : undefined,
        genres: genreTags.length > 0 ? genreTags : undefined,
      };
    });

    // Combine and sort by score
    const combined = [...realScores, ...parsedTestScores];
    return combined.sort((a, b) => b.score - a.score).slice(0, scoreOptions.limit || 100);
  }, [realScoresQuery.data, includeTestData, scoreOptions]);

  return {
    ...realScoresQuery,
    data: combinedData,
  };
}

/**
 * Get test player metadata by pubkey
 */
export function getTestPlayerMetadata(pubkey: string): NostrEvent | undefined {
  return TEST_PLAYER_METADATA[pubkey];
}

/**
 * Check if a pubkey is a test player
 */
export function isTestPlayer(pubkey: string): boolean {
  return pubkey in TEST_PLAYER_METADATA;
}

/**
 * Get leaderboard for a specific game with test data support
 */
export function useLeaderboardWithTestData(
  gameIdentifier: string,
  period: LeaderboardPeriod = 'all-time',
  options: {
    difficulty?: string;
    mode?: string;
    limit?: number;
    developerPubkey?: string;
    includeTestData?: boolean;
  } = {}
) {
  return useScoresWithTestData({
    gameIdentifier,
    period,
    ...options,
  });
}

/**
 * Get scores for a specific player with test data support
 */
export function usePlayerScoresWithTestData(
  playerPubkey: string,
  options: {
    gameIdentifier?: string;
    period?: LeaderboardPeriod;
    limit?: number;
    includeTestData?: boolean;
  } = {}
) {
  return useScoresWithTestData({
    playerPubkey,
    ...options,
  });
}
