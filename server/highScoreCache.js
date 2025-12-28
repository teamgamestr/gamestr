/**
 * High Score Cache
 * 
 * Maintains an in-memory cache of the highest score for each game
 * defined in gameConfig. This is used to determine if a new score
 * is a high score that deserves special announcement.
 * 
 * The cache is initialized by querying existing scores from relays
 * and updated as new scores come in.
 */

import { getMonitoredGames } from './botConfig.js';

/**
 * @typedef {Object} CachedHighScore
 * @property {number} score - The high score value
 * @property {string} playerPubkey - The player who achieved this score
 * @property {string} eventId - The Nostr event ID of this score
 * @property {number} timestamp - Unix timestamp when the score was achieved
 */

/**
 * In-memory cache of high scores
 * Key: gameKey (format: "developerPubkey:gameIdentifier")
 * Value: CachedHighScore
 * 
 * @type {Map<string, CachedHighScore>}
 */
const highScoreCache = new Map();

/**
 * Cache of top 3 scores for determining leaderboard position
 * Key: gameKey (format: "developerPubkey:gameIdentifier")
 * Value: Array of top 3 CachedHighScore objects, sorted by score descending
 * 
 * @type {Map<string, CachedHighScore[]>}
 */
const topScoresCache = new Map();

/**
 * Set of event IDs that have already been announced
 * Prevents duplicate announcements on restart or reconnection
 * 
 * @type {Set<string>}
 */
const announcedEvents = new Set();

/**
 * Maximum number of announced events to track (prevents memory leak)
 */
const MAX_ANNOUNCED_EVENTS = 10000;

/**
 * Initialize the cache for all monitored games
 */
export function initializeCache() {
  const monitoredGames = getMonitoredGames();
  
  for (const gameKey of monitoredGames) {
    if (!highScoreCache.has(gameKey)) {
      highScoreCache.set(gameKey, null);
    }
    if (!topScoresCache.has(gameKey)) {
      topScoresCache.set(gameKey, []);
    }
  }
  
  console.log(`[HighScoreCache] Initialized cache for ${monitoredGames.size} games`);
}

/**
 * Update the cache with a score event
 * 
 * @param {string} gameKey - The game key (format: "developerPubkey:gameIdentifier")
 * @param {number} score - The score value
 * @param {string} playerPubkey - The player's pubkey
 * @param {string} eventId - The Nostr event ID
 * @param {number} timestamp - Unix timestamp of the score
 * @returns {{ isHighScore: boolean, isTopThree: boolean, rank: number | null, previousHolder: CachedHighScore | null }}
 */
export function updateCache(gameKey, score, playerPubkey, eventId, timestamp) {
  const result = {
    isHighScore: false,
    isTopThree: false,
    rank: null,
    previousHolder: null,
  };
  
  // Update high score if this is higher
  const currentHigh = highScoreCache.get(gameKey);
  
  if (!currentHigh || score > currentHigh.score) {
    // Store the previous holder before updating (only if it's a different player)
    if (currentHigh && currentHigh.playerPubkey !== playerPubkey) {
      result.previousHolder = { ...currentHigh };
    }
    
    highScoreCache.set(gameKey, {
      score,
      playerPubkey,
      eventId,
      timestamp,
    });
    result.isHighScore = true;
    result.rank = 1;
  }
  
  // Update top 3 cache
  const topScores = topScoresCache.get(gameKey) || [];
  const newEntry = { score, playerPubkey, eventId, timestamp };
  
  // Add new score and re-sort
  topScores.push(newEntry);
  topScores.sort((a, b) => b.score - a.score);
  
  // Keep only top 3
  if (topScores.length > 3) {
    topScores.pop();
  }
  
  topScoresCache.set(gameKey, topScores);
  
  // Determine rank
  const rank = topScores.findIndex(s => s.eventId === eventId);
  if (rank !== -1 && rank < 3) {
    result.isTopThree = true;
    result.rank = rank + 1; // 1-indexed
  }
  
  return result;
}

/**
 * Get the current high score for a game
 * 
 * @param {string} gameKey - The game key
 * @returns {CachedHighScore | null}
 */
export function getHighScore(gameKey) {
  return highScoreCache.get(gameKey) || null;
}

/**
 * Get the top 3 scores for a game
 * 
 * @param {string} gameKey - The game key
 * @returns {CachedHighScore[]}
 */
export function getTopScores(gameKey) {
  return topScoresCache.get(gameKey) || [];
}

/**
 * Check if an event has already been announced
 * 
 * @param {string} eventId - The Nostr event ID
 * @returns {boolean}
 */
export function isEventAnnounced(eventId) {
  return announcedEvents.has(eventId);
}

/**
 * Mark an event as announced
 * 
 * @param {string} eventId - The Nostr event ID
 */
export function markEventAnnounced(eventId) {
  // Prevent memory leak by clearing old entries
  if (announcedEvents.size >= MAX_ANNOUNCED_EVENTS) {
    // Clear the oldest half of entries (simple approach)
    const entries = Array.from(announcedEvents);
    const toRemove = entries.slice(0, Math.floor(entries.length / 2));
    toRemove.forEach(id => announcedEvents.delete(id));
  }
  
  announcedEvents.add(eventId);
}

/**
 * Load existing high scores from an array of score events
 * Used during initialization to populate the cache from relay data
 * 
 * @param {Array<{ gameKey: string, score: number, playerPubkey: string, eventId: string, timestamp: number }>} scores
 */
export function loadExistingScores(scores) {
  // Group scores by game
  const scoresByGame = new Map();
  
  for (const scoreData of scores) {
    const { gameKey } = scoreData;
    
    if (!scoresByGame.has(gameKey)) {
      scoresByGame.set(gameKey, []);
    }
    
    scoresByGame.get(gameKey).push(scoreData);
  }
  
  // Process each game's scores
  for (const [gameKey, gameScores] of scoresByGame) {
    // Sort by score descending
    gameScores.sort((a, b) => b.score - a.score);
    
    // Set high score
    if (gameScores.length > 0) {
      const highest = gameScores[0];
      highScoreCache.set(gameKey, {
        score: highest.score,
        playerPubkey: highest.playerPubkey,
        eventId: highest.eventId,
        timestamp: highest.timestamp,
      });
    }
    
    // Set top 3
    const top3 = gameScores.slice(0, 3).map(s => ({
      score: s.score,
      playerPubkey: s.playerPubkey,
      eventId: s.eventId,
      timestamp: s.timestamp,
    }));
    topScoresCache.set(gameKey, top3);
    
    // Mark all existing events as already announced
    gameScores.forEach(s => announcedEvents.add(s.eventId));
  }
  
  console.log(`[HighScoreCache] Loaded ${scores.length} existing scores across ${scoresByGame.size} games`);
}

/**
 * Get cache statistics for debugging
 * 
 * @returns {{ gamesTracked: number, totalHighScores: number, announcedEvents: number }}
 */
export function getCacheStats() {
  let totalHighScores = 0;
  for (const score of highScoreCache.values()) {
    if (score) totalHighScores++;
  }
  
  return {
    gamesTracked: highScoreCache.size,
    totalHighScores,
    announcedEvents: announcedEvents.size,
  };
}

/**
 * Clear the cache (mainly for testing)
 */
export function clearCache() {
  highScoreCache.clear();
  topScoresCache.clear();
  announcedEvents.clear();
}
