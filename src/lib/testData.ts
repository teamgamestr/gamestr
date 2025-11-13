/**
 * Test data for local development and testing
 * This file contains sample score events that can be used without connecting to relays
 */

import type { NostrEvent } from '@nostrify/nostrify';

// Test developer pubkey (this would be a real pubkey in production)
export const TEST_DEV_PUBKEY = 'test-developer-pubkey-1234567890abcdef';

// Blockstr pubkey - all demo zaps go here
export const BLOCKSTR_PUBKEY = 'c70f635895bf0cade4f4c80863fe662a1d6e72153c9be357dc5fa5064c3624de';
// npub: npub1cupkxky4kuxtfnzunqgg8anx9gddde3489cr47tul6gxfnpkymxq7e6eqm

// Test player pubkeys
// Note: These use the blockstr pubkey so all demo zaps go to the real blockstr profile
// The lightning address will be fetched from the blockstr profile metadata
export const TEST_PLAYERS = [
  {
    pubkey: 'player-alice-pubkey-1234567890abcdef',
    name: 'Alice',
    picture: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Competitive gamer and speedrunner. Love arcade classics!',
    // Lightning address will be fetched from blockstr profile
    blockstrZap: true,
  },
  {
    pubkey: 'player-bob-pubkey-1234567890abcdef',
    name: 'Bob',
    picture: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Casual gamer enjoying puzzle games in my spare time.',
    blockstrZap: true,
  },
  {
    pubkey: 'player-charlie-pubkey-1234567890abcdef',
    name: 'Charlie',
    picture: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Professional esports player. Always pushing for #1!',
    blockstrZap: true,
  },
  {
    pubkey: 'player-diana-pubkey-1234567890abcdef',
    name: 'Diana',
    picture: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Game developer and player. Testing my own games!',
    blockstrZap: true,
  },
  {
    pubkey: 'player-eve-pubkey-1234567890abcdef',
    name: 'Eve',
    picture: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Retro gaming enthusiast. High scores are my passion!',
    blockstrZap: true,
  },
];

// Generate test score events
function createTestScore(
  gameIdentifier: string,
  playerIndex: number,
  score: number,
  options: {
    level?: string;
    difficulty?: string;
    mode?: string;
    duration?: number;
    achievements?: string[];
    daysAgo?: number;
  } = {}
): NostrEvent {
  const player = TEST_PLAYERS[playerIndex % TEST_PLAYERS.length];
  const now = Math.floor(Date.now() / 1000);
  const createdAt = now - (options.daysAgo || 0) * 86400;
  
  const tags: string[][] = [
    ['d', `${gameIdentifier}:${createdAt}:${Math.random().toString(36).substring(7)}`],
    ['game', gameIdentifier],
    ['score', score.toString()],
    ['p', player.pubkey],
    ['t', 'test'], // Mark as test data
  ];

  if (options.level) tags.push(['level', options.level]);
  if (options.difficulty) tags.push(['difficulty', options.difficulty]);
  if (options.mode) tags.push(['mode', options.mode]);
  if (options.duration) tags.push(['duration', options.duration.toString()]);
  if (options.achievements) tags.push(['achievements', options.achievements.join(',')]);

  return {
    id: `test-event-${gameIdentifier}-${playerIndex}-${score}`,
    pubkey: TEST_DEV_PUBKEY,
    created_at: createdAt,
    kind: 30762,
    tags,
    content: `${player.name} scored ${score.toLocaleString()} points!`,
    sig: 'test-signature-not-real',
  };
}

// Test scores for Snake Game
export const SNAKE_GAME_SCORES: NostrEvent[] = [
  createTestScore('snake-game', 2, 25000, { level: '15', difficulty: 'hard', mode: 'single-player', duration: 420, daysAgo: 0 }),
  createTestScore('snake-game', 4, 22500, { level: '14', difficulty: 'hard', mode: 'single-player', duration: 380, daysAgo: 0 }),
  createTestScore('snake-game', 0, 20000, { level: '13', difficulty: 'hard', mode: 'single-player', duration: 360, daysAgo: 1 }),
  createTestScore('snake-game', 1, 18500, { level: '12', difficulty: 'normal', mode: 'single-player', duration: 300, daysAgo: 1 }),
  createTestScore('snake-game', 3, 17000, { level: '11', difficulty: 'normal', mode: 'single-player', duration: 280, daysAgo: 2 }),
  createTestScore('snake-game', 2, 15500, { level: '10', difficulty: 'normal', mode: 'single-player', duration: 260, daysAgo: 3 }),
  createTestScore('snake-game', 0, 14000, { level: '9', difficulty: 'easy', mode: 'single-player', duration: 240, daysAgo: 3 }),
  createTestScore('snake-game', 4, 12500, { level: '8', difficulty: 'easy', mode: 'single-player', duration: 220, daysAgo: 5 }),
  createTestScore('snake-game', 1, 11000, { level: '7', difficulty: 'easy', mode: 'single-player', duration: 200, daysAgo: 7 }),
  createTestScore('snake-game', 3, 9500, { level: '6', difficulty: 'easy', mode: 'single-player', duration: 180, daysAgo: 10 }),
];

// Test scores for Tetris
export const TETRIS_SCORES: NostrEvent[] = [
  createTestScore('tetris-clone', 3, 45000, { level: '20', difficulty: 'expert', mode: 'single-player', duration: 600, achievements: ['line-clear-master', 'tetris-king'], daysAgo: 0 }),
  createTestScore('tetris-clone', 0, 42000, { level: '19', difficulty: 'expert', mode: 'single-player', duration: 580, daysAgo: 0 }),
  createTestScore('tetris-clone', 2, 38000, { level: '18', difficulty: 'hard', mode: 'single-player', duration: 540, daysAgo: 1 }),
  createTestScore('tetris-clone', 4, 35000, { level: '17', difficulty: 'hard', mode: 'single-player', duration: 520, daysAgo: 2 }),
  createTestScore('tetris-clone', 1, 32000, { level: '16', difficulty: 'hard', mode: 'single-player', duration: 480, daysAgo: 3 }),
  createTestScore('tetris-clone', 3, 28000, { level: '15', difficulty: 'normal', mode: 'single-player', duration: 450, daysAgo: 4 }),
  createTestScore('tetris-clone', 0, 25000, { level: '14', difficulty: 'normal', mode: 'single-player', duration: 420, daysAgo: 6 }),
  createTestScore('tetris-clone', 2, 22000, { level: '13', difficulty: 'normal', mode: 'single-player', duration: 400, daysAgo: 8 }),
];

// Test scores for Racing Game
export const RACING_SCORES: NostrEvent[] = [
  createTestScore('speed-racer', 2, 98500, { level: 'circuit-5', difficulty: 'expert', mode: 'time-trial', duration: 185, achievements: ['perfect-lap', 'speed-demon'], daysAgo: 0 }),
  createTestScore('speed-racer', 4, 95000, { level: 'circuit-5', difficulty: 'expert', mode: 'time-trial', duration: 190, daysAgo: 0 }),
  createTestScore('speed-racer', 0, 92000, { level: 'circuit-4', difficulty: 'hard', mode: 'time-trial', duration: 195, daysAgo: 1 }),
  createTestScore('speed-racer', 3, 88500, { level: 'circuit-4', difficulty: 'hard', mode: 'time-trial', duration: 200, daysAgo: 1 }),
  createTestScore('speed-racer', 1, 85000, { level: 'circuit-3', difficulty: 'normal', mode: 'time-trial', duration: 210, daysAgo: 2 }),
  createTestScore('speed-racer', 2, 82000, { level: 'circuit-3', difficulty: 'normal', mode: 'time-trial', duration: 220, daysAgo: 4 }),
];

// Test scores for Puzzle Game
export const PUZZLE_SCORES: NostrEvent[] = [
  createTestScore('match-three', 1, 156000, { level: '50', difficulty: 'hard', mode: 'endless', duration: 900, achievements: ['combo-master', 'gem-crusher'], daysAgo: 0 }),
  createTestScore('match-three', 3, 145000, { level: '48', difficulty: 'hard', mode: 'endless', duration: 850, daysAgo: 0 }),
  createTestScore('match-three', 0, 132000, { level: '45', difficulty: 'normal', mode: 'endless', duration: 800, daysAgo: 1 }),
  createTestScore('match-three', 4, 125000, { level: '42', difficulty: 'normal', mode: 'endless', duration: 750, daysAgo: 2 }),
  createTestScore('match-three', 2, 118000, { level: '40', difficulty: 'normal', mode: 'endless', duration: 700, daysAgo: 3 }),
  createTestScore('match-three', 1, 110000, { level: '38', difficulty: 'easy', mode: 'endless', duration: 650, daysAgo: 5 }),
];

// Test scores for Space Shooter
export const SHOOTER_SCORES: NostrEvent[] = [
  createTestScore('space-shooter', 4, 285000, { level: 'wave-25', difficulty: 'expert', mode: 'survival', duration: 1200, achievements: ['alien-destroyer', 'no-damage'], daysAgo: 0 }),
  createTestScore('space-shooter', 2, 265000, { level: 'wave-23', difficulty: 'expert', mode: 'survival', duration: 1100, daysAgo: 0 }),
  createTestScore('space-shooter', 0, 245000, { level: 'wave-21', difficulty: 'hard', mode: 'survival', duration: 1000, daysAgo: 1 }),
  createTestScore('space-shooter', 3, 225000, { level: 'wave-19', difficulty: 'hard', mode: 'survival', duration: 900, daysAgo: 2 }),
  createTestScore('space-shooter', 1, 205000, { level: 'wave-17', difficulty: 'normal', mode: 'survival', duration: 800, daysAgo: 3 }),
  createTestScore('space-shooter', 4, 185000, { level: 'wave-15', difficulty: 'normal', mode: 'survival', duration: 700, daysAgo: 5 }),
];

// All test scores combined
export const ALL_TEST_SCORES: NostrEvent[] = [
  ...SNAKE_GAME_SCORES,
  ...TETRIS_SCORES,
  ...RACING_SCORES,
  ...PUZZLE_SCORES,
  ...SHOOTER_SCORES,
];

// Test player metadata (kind 0 events)
// Note: We create a base metadata record, but the actual metadata
// will be enhanced with blockstr's lightning address at runtime
export const TEST_PLAYER_METADATA: Record<string, NostrEvent> = {};

TEST_PLAYERS.forEach((player) => {
  TEST_PLAYER_METADATA[player.pubkey] = {
    id: `test-metadata-${player.pubkey}`,
    pubkey: player.pubkey,
    created_at: Math.floor(Date.now() / 1000) - 86400 * 30, // 30 days ago
    kind: 0,
    tags: [],
    content: JSON.stringify({
      name: player.name,
      picture: player.picture,
      about: player.about,
      // Will be populated with blockstr's lightning address
    }),
    sig: 'test-signature-not-real',
  };
});

// Cache for blockstr metadata
let blockstrMetadataCache: NostrEvent | null = null;

/**
 * Fetch blockstr profile metadata and cache it
 */
async function fetchBlockstrMetadata(nostr: any): Promise<NostrEvent | null> {
  if (blockstrMetadataCache) {
    return blockstrMetadataCache;
  }

  try {
    const [event] = await nostr.query(
      [{ kinds: [0], authors: [BLOCKSTR_PUBKEY], limit: 1 }],
      { signal: AbortSignal.timeout(3000) }
    );

    if (event) {
      blockstrMetadataCache = event;
      return event;
    }
  } catch (error) {
    console.warn('Failed to fetch blockstr metadata:', error);
  }

  return null;
}

/**
 * Check if an event is test data
 */
export function isTestEvent(event: NostrEvent): boolean {
  return event.tags.some(([name, value]) => name === 't' && value === 'test');
}

/**
 * Filter out test events from a list
 */
export function filterTestEvents(events: NostrEvent[]): NostrEvent[] {
  return events.filter(event => !isTestEvent(event));
}

/**
 * Get only test events from a list
 */
export function getTestEvents(events: NostrEvent[]): NostrEvent[] {
  return events.filter(isTestEvent);
}

/**
 * Get test player metadata by pubkey
 * Returns a promise that resolves with metadata enhanced with blockstr's lightning address
 */
export async function getTestPlayerMetadata(pubkey: string, nostr?: any): Promise<NostrEvent | undefined> {
  const baseMetadata = TEST_PLAYER_METADATA[pubkey];
  if (!baseMetadata) return undefined;

  // If nostr client is provided, try to fetch blockstr's lightning address
  if (nostr) {
    try {
      const blockstrMeta = await fetchBlockstrMetadata(nostr);
      if (blockstrMeta) {
        const blockstrData = JSON.parse(blockstrMeta.content);
        const lud16 = blockstrData.lud16 || blockstrData.lud06;
        
        if (lud16) {
          // Parse the base metadata and add the lightning address
          const baseData = JSON.parse(baseMetadata.content);
          return {
            ...baseMetadata,
            content: JSON.stringify({
              ...baseData,
              lud16: lud16,
            }),
          };
        }
      }
    } catch (error) {
      console.warn('Failed to enhance test metadata with blockstr lightning address:', error);
    }
  }

  // Return base metadata without lightning address if fetch fails
  return baseMetadata;
}

/**
 * Synchronous version that returns metadata without blockstr lightning address
 * Used as fallback when async fetch is not possible
 */
export function getTestPlayerMetadataSync(pubkey: string): NostrEvent | undefined {
  return TEST_PLAYER_METADATA[pubkey];
}

/**
 * Check if a pubkey is a test player
 */
export function isTestPlayer(pubkey: string): boolean {
  return pubkey in TEST_PLAYER_METADATA;
}
