/**
 * Test data for local development and testing
 * This file contains sample score events that can be used without connecting to relays
 */

import type { NostrEvent } from '@nostrify/nostrify';

// Test developer pubkey (this would be a real pubkey in production)
export const TEST_DEV_PUBKEY = 'test-developer-pubkey-1234567890abcdef';

// Test player pubkeys
export const TEST_PLAYERS = [
  {
    pubkey: 'player-alice-pubkey-1234567890abcdef',
    name: 'Alice',
    picture: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Competitive gamer and speedrunner. Love arcade classics!',
  },
  {
    pubkey: 'player-bob-pubkey-1234567890abcdef',
    name: 'Bob',
    picture: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Casual gamer enjoying puzzle games in my spare time.',
  },
  {
    pubkey: 'player-charlie-pubkey-1234567890abcdef',
    name: 'Charlie',
    picture: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Professional esports player. Always pushing for #1!',
  },
  {
    pubkey: 'player-diana-pubkey-1234567890abcdef',
    name: 'Diana',
    picture: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Game developer and player. Testing my own games!',
  },
  {
    pubkey: 'player-eve-pubkey-1234567890abcdef',
    name: 'Eve',
    picture: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=200',
    about: 'Retro gaming enthusiast. High scores are my passion!',
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
    kind: 762,
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
    }),
    sig: 'test-signature-not-real',
  };
});

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
