/**
 * Game metadata configuration
 * Maps <developer-pubkey>:<game-identifier> to game metadata
 */

/**
 * Score Bot Configuration
 *
 * The bot creates kind 1 Nostr notes announcing new scores for configured games.
 * Set SCORE_BOT_PRIVATE_KEY environment variable to enable the bot.
 *
 * Template variables:
 * - {playerTag}        - nostr:npub... tag for the player
 * - {gameTag}          - nostr:npub... tag for the game developer
 * - {gameName}         - Human-readable game name
 * - {score}            - Score value (formatted with commas)
 * - {scoreRaw}         - Raw score value (no formatting)
 * - {scoreLink}        - Link to the score on the site
 * - {gameLink}         - Link to the game leaderboard
 * - {level}            - Level/stage (if available)
 * - {difficulty}       - Difficulty setting (if available)
 * - {rank}             - Player's rank for top scores
 * - {previousHolderTag} - nostr:npub... tag for dethroned high score holder (high scores only)
 * - {previousScore}    - Previous high score value (high scores only)
 */
export const SCORE_BOT_CONFIG = {
  // Base URL for score and game links
  baseUrl: "https://gamestr.io",

  // Relays to publish bot announcements to
  publishRelays: [
    "wss://relay.nostr.band",
    "wss://relay.damus.io",
    "wss://nos.lol",
  ],

  // Relays to subscribe to for score events
  subscribeRelays: [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net",
  ],

  // Note templates for different score scenarios
  templates: {
    // Template for regular new scores
    newScore: `{playerTag} just scored {score} points in {gameName}! {gameTag}

Check it out: {scoreLink}`,

    // Template for new high scores (beats previous record)
    highScore: `NEW HIGH SCORE! {playerTag} just dethroned {previousHolderTag} in {gameName} with {score} points! {gameTag}

The previous record of {previousScore} has been crushed!

{scoreLink}`,

    // Template for first high score (no previous holder)
    firstHighScore: `NEW HIGH SCORE! {playerTag} just set the first record in {gameName} with {score} points! {gameTag}

This is now the #1 score on the leaderboard!

{scoreLink}`,

    // Template for top 3 scores (but not #1)
    topScore: `{playerTag} just cracked the top 3 in {gameName} with {score} points! (Rank #{rank}) {gameTag}

{scoreLink}`,
  },
};

export interface GameMetadata {
  name: string;
  description: string;
  image: string;
  genres: string[];
  url?: string;
  developer?: string;
  featured?: boolean;
  trending?: boolean;
  newRelease?: boolean;
  playerSigned?: boolean;
  leaderboards?: LeaderboardConfig[];
}

export interface GameConfigMap {
  [key: string]: GameMetadata; // key format: "<pubkey>:<game-identifier>"
}

export type ScoreDirection = "desc" | "asc";

export interface LeaderboardConfig {
  label: string;
  scoreTag: string;
  direction: ScoreDirection;
  displayTag?: string;
  displayLabel?: string;
}

export interface Kind5555GameConfig {
  scoreField: string;
  scoreDirection: ScoreDirection;
  metadata: GameMetadata;
}

export interface Kind5555GamesMap {
  [gameTag: string]: Kind5555GameConfig;
}

export const KIND_5555_GAMES: Kind5555GamesMap = {
  word5: {
    scoreField: "streak",
    scoreDirection: "desc",
    metadata: {
      name: "Word5",
      description:
        "A daily word puzzle game. Guess the 5-letter word in as few tries as possible!",
      image:
        "https://images.pexels.com/photos/278888/pexels-photo-278888.jpeg?auto=compress&cs=tinysrgb&w=800",
      genres: ["puzzle", "casual"],
      url: "https://word5.otherstuff.ai",
      developer: "otherstuff.ai",
      featured: false,
      trending: false,
      newRelease: true,
    },
  },
  unicornvssnakes: {
    scoreField: "score",
    scoreDirection: "desc",
    metadata: {
      name: "Unicorn vs Snakes",
      description: "Who put all these snakes on this 2D plane?!?",
      image: "https://unicorn.dergigi.com/og.png",
      genres: ["arcade", "action"],
      url: "https://unicorn.dergigi.com",
      developer: "npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc",
      featured: false,
      trending: false,
      newRelease: true,
    },
  },
};

export function getKind5555Config(
  gameTag: string,
): Kind5555GameConfig | undefined {
  return KIND_5555_GAMES[gameTag];
}

export function isKind5555Game(gameTag: string): boolean {
  return gameTag in KIND_5555_GAMES;
}

export function getAllKind5555Games(): Array<{
  gameTag: string;
  config: Kind5555GameConfig;
}> {
  return Object.entries(KIND_5555_GAMES).map(([gameTag, config]) => ({
    gameTag,
    config,
  }));
}

// Default fallback metadata for unknown games
export const FALLBACK_GAME_METADATA: GameMetadata = {
  name: "Unknown Game",
  description:
    "No description available. Add metadata to improve this listing.",
  image:
    "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800",
  genres: ["uncategorized"],
  featured: false,
  trending: false,
  newRelease: false,
};

// Initial game configuration (can be extended by users/admins)
export const INITIAL_GAME_CONFIG: GameConfigMap = {
  // Example game configurations
  // Format: "<developer-pubkey>:<game-identifier>"

  //Blockstr
  "c70f635895bf0cade4f4c80863fe662a1d6e72153c9be357dc5fa5064c3624de:blockstr": {
    name: "blockstr",
    description: "Classic 8-bit Tetris with a timechain twist!",
    image: "https://i.nostr.build/rwl4S2TucTObXR3T.webp",
    genres: ["arcade", "casual", "retro"],
    url: "https://blockstr.io",
    developer: "npub1jwh6vzw5tzpwh6g79m72grzae5hsv99f3x9v3l35uux477m6lk9slqhpvc",
    featured: true,
    trending: false,
    newRelease: false,
  },

  //Space Zappers
  "6c95ab59b0ebf56296f45b8b52b9b0f2599029c173a8c5fd463ef0a474995fcc:space-zappers":
    {
      name: "Space Zappers",
      description:
        "A retro Space Invaders arcade game. Pay 21 sats to play. Publish your high scores to the decentralized Nostr leaderboard",
      image: "https://www.spacezappers.com/og-image.png",
      genres: ["arcade", "shooter", "retro"],
      url: "https://www.spacezappers.com/",
      developer: "npub1sfpeyr9k5jms37q4900mw9q4vze4xwhdxd4avdxjml8rqgjkre8s4lcq9l",
      featured: true,
      trending: false,
      newRelease: false,
    },

  //Nostrich Run
  "277813f913fae89093c5cb443c671c0612144c636a43f08abcde2ef2f43d4978:nostrich-run":
    {
      name: "Nostrich Run",
      description: "Endless Nostrich side-scroller.",
      image: "https://nostrichrun.whitepaperinteractive.com/logo.png",
      genres: ["endless", "side-scroller", "arcade"],
      url: "nostrichrun.whitepaperinteractive.com",
      developer: "Whitepaper Interactive",
      featured: false,
      trending: false,
      newRelease: false,
    },

  //Sat Snake
  "277813f913fae89093c5cb443c671c0612144c636a43f08abcde2ef2f43d4978:satsnake": {
    name: "Sat Snake",
    description: "Feed the Bitcoin-hungry Snake.",
    image: "https://satsnake.whitepaperinteractive.com/assets/logo.png",
    genres: ["mobile", "retro", "casual"],
    url: "https://satsnake.whitepaperinteractive.com/",
    developer: "Whitepaper Interactive",
    featured: false,
    trending: false,
    newRelease: false,
  },

  // BTC Proof of Play
  "f02da534c04a14ec5d11bec66b494543e3f6aa839a5f7e8a756475e6601ae18a:btc-proof-of-play": {
    name: "BTC Proof of Play",
    description: "BTC Proof of Play",
    image:
      "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800",
    genres: ["uncategorized"],
    developer: "npub17qk62dxqfg2wchg3hmrxkj29g03ld25rnf0hazn4v367vcq6ux9qw485cc",
    featured: false,
    trending: false,
    newRelease: true,
  },

  // Player-signed games (kind 30762, no developer pubkey)
  "nopubkey:wordswithzaps": {
    name: "Words With Zaps",
    description:
      "A competitive word game powered by zaps. Form words, score points, and zap your way to victory!",
    image: "https://wordswithzaps.top/wwz_gamestr.png",
    genres: ["puzzle", "casual"],
    url: "https://wordswithzaps.top",
    developer: "npub1aeh2zw4elewy5682lxc6xnlqzjnxksq303gwu2npfaxd49vmde6qcq4nwx",
    featured: true,
    trending: true,
    newRelease: true,
    playerSigned: true,
    leaderboards: [
      { label: "Score", scoreTag: "score", direction: "desc" },
      { label: "Highest Word", scoreTag: "score:highestword", direction: "desc", displayTag: "highestword", displayLabel: "Word" },
    ],
  },
};

// Generate a hash from game configuration content
// This ensures version changes automatically when config is modified
function generateConfigHash(config: GameConfigMap): string {
  const configString = JSON.stringify(config);
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

// Auto-generated config version based on content hash
export const GAME_CONFIG_VERSION = generateConfigHash(INITIAL_GAME_CONFIG);

export const NO_PUBKEY_PREFIX = "nopubkey";

// Games to exclude from display (by game name/identifier)
// Add game identifiers here to hide them from the platform
export const EXCLUDED_GAMES: string[] = [
  "Nostrich Run",
  "zap-raptor",
  "bitcoin-space-invaders",
];

// All available genres
export const GAME_GENRES = [
  "action",
  "adventure",
  "arcade",
  "casual",
  "fps",
  "match-3",
  "multiplayer",
  "puzzle",
  "racing",
  "retro",
  "rpg",
  "sci-fi",
  "shooter",
  "simulation",
  "sports",
  "strategy",
  "3d",
  "uncategorized",
] as const;

export type GameGenre = (typeof GAME_GENRES)[number];

/**
 * Get game metadata by developer pubkey and game identifier
 */
export function getGameMetadata(
  pubkey: string,
  gameIdentifier: string,
  customConfig?: GameConfigMap,
): GameMetadata {
  const config = customConfig || INITIAL_GAME_CONFIG;
  const key = `${pubkey}:${gameIdentifier}`;

  if (config[key]) return config[key];
  if (INITIAL_GAME_CONFIG[key]) return INITIAL_GAME_CONFIG[key];

  const k5555 = KIND_5555_GAMES[gameIdentifier];
  if (k5555) return k5555.metadata;

  return FALLBACK_GAME_METADATA;
}

/**
 * Resolve a game identifier to its metadata and pubkey.
 * Searches INITIAL_GAME_CONFIG, KIND_5555_GAMES, and custom config.
 */
export function resolveGameByIdentifier(
  gameIdentifier: string,
  customConfig?: GameConfigMap,
): { pubkey: string; metadata: GameMetadata } | null {
  const config = customConfig || INITIAL_GAME_CONFIG;

  for (const [key, metadata] of Object.entries(config)) {
    const parsed = parseGameKey(key);
    if (parsed && parsed.gameIdentifier === gameIdentifier) {
      return { pubkey: parsed.pubkey, metadata };
    }
  }

  if (config !== INITIAL_GAME_CONFIG) {
    for (const [key, metadata] of Object.entries(INITIAL_GAME_CONFIG)) {
      const parsed = parseGameKey(key);
      if (parsed && parsed.gameIdentifier === gameIdentifier) {
        return { pubkey: parsed.pubkey, metadata };
      }
    }
  }

  const k5555 = KIND_5555_GAMES[gameIdentifier];
  if (k5555) {
    return { pubkey: NO_PUBKEY_PREFIX, metadata: k5555.metadata };
  }

  return null;
}

/**
 * Create a game config key from pubkey and game identifier
 */
export function createGameKey(pubkey: string, gameIdentifier: string): string {
  return `${pubkey}:${gameIdentifier}`;
}

/**
 * Parse a game config key into pubkey and game identifier
 */
export function parseGameKey(
  key: string,
): { pubkey: string; gameIdentifier: string } | null {
  const parts = key.split(":");
  if (parts.length < 2) return null;

  const pubkey = parts[0];
  const gameIdentifier = parts.slice(1).join(":"); // Handle identifiers with colons

  return { pubkey, gameIdentifier };
}

/**
 * Check if a game key represents a game without a Nostr pubkey
 */
export function isNoPubkeyGame(pubkey: string): boolean {
  return pubkey === NO_PUBKEY_PREFIX;
}

export function isPlayerSignedGame(gameIdentifier: string): boolean {
  const key = `${NO_PUBKEY_PREFIX}:${gameIdentifier}`;
  const metadata = INITIAL_GAME_CONFIG[key];
  return metadata?.playerSigned === true;
}

/**
 * Get all games without a Nostr pubkey from the config
 */
export function getNoPubkeyGames(customConfig?: GameConfigMap): Array<{
  key: string;
  pubkey: string;
  gameIdentifier: string;
  metadata: GameMetadata;
}> {
  return getAllGames(customConfig).filter((game) =>
    isNoPubkeyGame(game.pubkey),
  );
}

/**
 * Get all configured games
 */
export function getAllGames(customConfig?: GameConfigMap): Array<{
  key: string;
  pubkey: string;
  gameIdentifier: string;
  metadata: GameMetadata;
}> {
  const config = customConfig || INITIAL_GAME_CONFIG;

  return Object.entries(config).map(([key, metadata]) => {
    const parsed = parseGameKey(key);
    return {
      key,
      pubkey: parsed?.pubkey || "",
      gameIdentifier: parsed?.gameIdentifier || "",
      metadata,
    };
  });
}

/**
 * Filter games by genre
 */
export function filterGamesByGenre(
  genre: string,
  customConfig?: GameConfigMap,
): Array<{
  key: string;
  pubkey: string;
  gameIdentifier: string;
  metadata: GameMetadata;
}> {
  return getAllGames(customConfig).filter((game) =>
    game.metadata.genres.includes(genre),
  );
}

/**
 * Get featured games
 */
export function getFeaturedGames(customConfig?: GameConfigMap) {
  return getAllGames(customConfig).filter((game) => game.metadata.featured);
}

/**
 * Get trending games
 */
export function getTrendingGames(customConfig?: GameConfigMap) {
  return getAllGames(customConfig).filter((game) => game.metadata.trending);
}

/**
 * Get new release games
 */
export function getNewReleaseGames(customConfig?: GameConfigMap) {
  return getAllGames(customConfig).filter((game) => game.metadata.newRelease);
}
