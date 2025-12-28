/**
 * Score Bot Configuration
 * 
 * Configures the Nostr score announcement bot including:
 * - Note templates for regular scores and high scores
 * - Relay configuration for publishing
 * - Game filtering (only announce for configured games)
 * 
 * All configuration except the private key is loaded from gameConfig.ts
 * via the generated game-config.json file.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load game configuration from the built game-config.json
 */
function loadGameConfig() {
  const configPath = join(__dirname, '..', 'dist', 'game-config.json');
  
  if (!existsSync(configPath)) {
    console.warn('[BotConfig] Warning: game-config.json not found. Run "npm run build" first.');
    return { games: {}, scoreBot: null };
  }
  
  try {
    const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
    return {
      games: configData.games || {},
      scoreBot: configData.scoreBot || null,
    };
  } catch (error) {
    console.error('[BotConfig] Error loading game config:', error.message);
    return { games: {}, scoreBot: null };
  }
}

/**
 * Parse a game config key into pubkey and game identifier
 * 
 * @param {string} key - Game key in format "pubkey:gameIdentifier"
 * @returns {{ pubkey: string, gameIdentifier: string } | null}
 */
function parseGameKey(key) {
  const parts = key.split(':');
  if (parts.length < 2) return null;

  const pubkey = parts[0];
  const gameIdentifier = parts.slice(1).join(':'); // Handle identifiers with colons

  return { pubkey, gameIdentifier };
}

// Load game config at module initialization
const { games: GAME_CONFIG, scoreBot: SCORE_BOT_JSON_CONFIG } = loadGameConfig();

// Default bot configuration (used if not in JSON)
const DEFAULT_BOT_CONFIG = {
  baseUrl: 'https://gamestr.io',
  publishRelays: [
    'wss://relay.nostr.band',
    'wss://relay.damus.io',
    'wss://nos.lol',
  ],
  subscribeRelays: ['wss://relay.nostr.band'],
  templates: {
    newScore: `{playerTag} just scored {score} points in {gameName}! {gameTag}

Check it out: {scoreLink}`,
    highScore: `NEW HIGH SCORE! {playerTag} just dethroned {previousHolderTag} in {gameName} with {score} points! {gameTag}

The previous record of {previousScore} has been crushed!

{scoreLink}`,
    firstHighScore: `NEW HIGH SCORE! {playerTag} just set the first record in {gameName} with {score} points! {gameTag}

This is now the #1 score on the leaderboard!

{scoreLink}`,
    topScore: `{playerTag} just cracked the top 3 in {gameName} with {score} points! (Rank #{rank}) {gameTag}

{scoreLink}`,
  },
};

/**
 * Bot configuration
 * Private key comes from environment variable, everything else from gameConfig.ts
 */
export const BOT_CONFIG = {
  // Bot's private key (hex format) - REQUIRED
  // Set via SCORE_BOT_PRIVATE_KEY environment variable
  privateKey: process.env.SCORE_BOT_PRIVATE_KEY || '',
  
  // Whether the bot is enabled
  enabled: !!process.env.SCORE_BOT_PRIVATE_KEY,
  
  // Relays to publish bot announcements to (from gameConfig.ts)
  relays: SCORE_BOT_JSON_CONFIG?.publishRelays || DEFAULT_BOT_CONFIG.publishRelays,
  
  // Relays to subscribe to for score events (from gameConfig.ts)
  subscribeRelays: SCORE_BOT_JSON_CONFIG?.subscribeRelays || DEFAULT_BOT_CONFIG.subscribeRelays,
  
  // Base URL for score links (from gameConfig.ts)
  baseUrl: SCORE_BOT_JSON_CONFIG?.baseUrl || DEFAULT_BOT_CONFIG.baseUrl,
};

/**
 * Note templates for different score scenarios (from gameConfig.ts)
 */
export const NOTE_TEMPLATES = {
  newScore: SCORE_BOT_JSON_CONFIG?.templates?.newScore || DEFAULT_BOT_CONFIG.templates.newScore,
  highScore: SCORE_BOT_JSON_CONFIG?.templates?.highScore || DEFAULT_BOT_CONFIG.templates.highScore,
  firstHighScore: SCORE_BOT_JSON_CONFIG?.templates?.firstHighScore || DEFAULT_BOT_CONFIG.templates.firstHighScore,
  topScore: SCORE_BOT_JSON_CONFIG?.templates?.topScore || DEFAULT_BOT_CONFIG.templates.topScore,
};

/**
 * Get the loaded game configuration
 * 
 * @returns {Object} Game configuration map
 */
export function getGameConfig() {
  return GAME_CONFIG;
}

/**
 * Get the list of game keys that the bot should monitor
 * Only games defined in GAME_CONFIG will be announced
 * 
 * @returns {Set<string>} Set of game keys in format "pubkey:gameIdentifier"
 */
export function getMonitoredGames() {
  // Filter out test games (those with test developer pubkeys)
  const monitoredGames = new Set();
  
  for (const gameKey of Object.keys(GAME_CONFIG)) {
    const parsed = parseGameKey(gameKey);
    if (parsed && !parsed.pubkey.startsWith('test-')) {
      monitoredGames.add(gameKey);
    }
  }
  
  return monitoredGames;
}

/**
 * Get the developer pubkeys that the bot should subscribe to
 * 
 * @returns {string[]} Array of developer pubkeys
 */
export function getMonitoredDeveloperPubkeys() {
  const pubkeys = new Set();
  
  for (const gameKey of Object.keys(GAME_CONFIG)) {
    const parsed = parseGameKey(gameKey);
    if (parsed && !parsed.pubkey.startsWith('test-')) {
      pubkeys.add(parsed.pubkey);
    }
  }
  
  return Array.from(pubkeys);
}

/**
 * Check if a game should be monitored by the bot
 * 
 * @param {string} developerPubkey - The game developer's pubkey
 * @param {string} gameIdentifier - The game identifier
 * @returns {boolean} Whether this game should be monitored
 */
export function isMonitoredGame(developerPubkey, gameIdentifier) {
  const gameKey = `${developerPubkey}:${gameIdentifier}`;
  return getMonitoredGames().has(gameKey);
}

/**
 * Format a number with commas for display
 * 
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatScore(num) {
  return num.toLocaleString('en-US');
}

/**
 * Build a score link URL
 * 
 * @param {string} developerPubkey - The game developer's pubkey
 * @param {string} gameIdentifier - The game identifier
 * @param {string} eventId - The score event ID
 * @returns {string} Full URL to the score
 */
export function buildScoreLink(developerPubkey, gameIdentifier, eventId) {
  return `${BOT_CONFIG.baseUrl}/score/${developerPubkey}/${gameIdentifier}/${eventId}`;
}

/**
 * Build a game leaderboard link URL
 * 
 * @param {string} developerPubkey - The game developer's pubkey
 * @param {string} gameIdentifier - The game identifier
 * @returns {string} Full URL to the game leaderboard
 */
export function buildGameLink(developerPubkey, gameIdentifier) {
  return `${BOT_CONFIG.baseUrl}/game/${developerPubkey}/${gameIdentifier}`;
}
