/**
 * Game metadata configuration
 * Maps <developer-pubkey>:<game-identifier> to game metadata
 */

/**
 * Config version - UPDATE THIS whenever you modify INITIAL_GAME_CONFIG
 * This forces cache invalidation in users' browsers
 */
export const GAME_CONFIG_VERSION = "2026-02-24-v3";

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
}

export interface GameConfigMap {
  [key: string]: GameMetadata; // key format: "<pubkey>:<game-identifier>"
}

export type ScoreDirection = 'desc' | 'asc';

export interface Kind5555GameConfig {
  scoreField: string;
  scoreDirection: ScoreDirection;
  metadata: GameMetadata;
}

export interface Kind5555GamesMap {
  [gameTag: string]: Kind5555GameConfig;
}

export const KIND_5555_GAMES: Kind5555GamesMap = {
  "word5": {
    scoreField: "result",
    scoreDirection: "asc",
    metadata: {
      name: "Word5",
      description: "A daily word puzzle game. Guess the 5-letter word in as few tries as possible!",
      image: "https://images.pexels.com/photos/278888/pexels-photo-278888.jpeg?auto=compress&cs=tinysrgb&w=800",
      genres: ["puzzle", "casual"],
      url: "https://word5.otherstuff.ai",
      developer: "otherstuff.ai",
      featured: false,
      trending: true,
      newRelease: true,
    },
  },
  "unicornvssnakes": {
    scoreField: "score",
    scoreDirection: "desc",
    metadata: {
      name: "Unicorn vs Snakes",
      description: "Who put all these snakes on this 2D plane?!?",
      image: "https://unicorn.dergigi.com/og.png",
      genres: ["arcade", "action"],
      url: "https://unicorn.dergigi.com",
      developer: "dergigi",
      featured: false,
      trending: false,
      newRelease: true,
    },
  },
};

export function getKind5555Config(gameTag: string): Kind5555GameConfig | undefined {
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
    developer: "sambonzuki",
    featured: true,
    trending: true,
    newRelease: true,
  },

  //Space Zappers
  "6c95ab59b0ebf56296f45b8b52b9b0f2599029c173a8c5fd463ef0a474995fcc:space-zappers": {
      name: "Space Zappers",
      description:
        "A retro Space Invaders arcade game. Pay 21 sats to play. Publish your high scores to the decentralized Nostr leaderboard",
      image: "https://www.spacezappers.com/og-image.png",
      genres: ["arcade", "shooter", "retro"],
      url: "https://www.spacezappers.com/",
      developer: "NiniMonk05",
      featured: true,
      trending: true,
      newRelease: true,
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
      newRelease: true,
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
    trending: true,
    newRelease: true,
  },

  // Snake Game Example (matches test data)
  "test-developer-pubkey-1234567890abcdef:snake-game": {
    name: "Classic Snake",
    description:
      "The timeless arcade classic! Eat apples, grow longer, and avoid hitting yourself. How high can you score?",
    image:
      "https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=800",
    genres: ["arcade", "casual", "retro"],
    url: "https://example.com/snake",
    developer: "Example Dev",
    featured: true,
    trending: true,
    newRelease: false,
  },

  // Tetris Example (matches test data)
  "test-developer-pubkey-1234567890abcdef:tetris-clone": {
    name: "Block Puzzle Master",
    description:
      "Stack falling blocks to clear lines and rack up massive combos. A puzzle game that never gets old!",
    image:
      "https://images.pexels.com/photos/371924/pexels-photo-371924.jpeg?auto=compress&cs=tinysrgb&w=800",
    genres: ["puzzle", "arcade", "retro"],
    url: "https://example.com/tetris",
    developer: "Example Dev",
    featured: true,
    trending: false,
    newRelease: false,
  },

  // Racing Game Example (matches test data)
  "test-developer-pubkey-1234567890abcdef:speed-racer": {
    name: "Speed Racer 3D",
    description:
      "Hit the track in this high-octane racing game. Drift around corners, boost past opponents, and dominate the leaderboards!",
    image:
      "https://images.pexels.com/photos/1202723/pexels-photo-1202723.jpeg?auto=compress&cs=tinysrgb&w=800",
    genres: ["racing", "action", "3d"],
    url: "https://example.com/racer",
    developer: "Example Dev",
    featured: false,
    trending: true,
    newRelease: true,
  },

  // Puzzle Game Example (matches test data)
  "test-developer-pubkey-1234567890abcdef:match-three": {
    name: "Gem Crusher",
    description:
      "Match colorful gems in this addictive puzzle game. Create cascading combos and special power-ups!",
    image:
      "https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=800",
    genres: ["puzzle", "casual", "match-3"],
    url: "https://example.com/gems",
    developer: "Example Dev",
    featured: false,
    trending: false,
    newRelease: true,
  },

  // FPS Example (matches test data)
  "test-developer-pubkey-1234567890abcdef:space-shooter": {
    name: "Cosmic Defender",
    description:
      "Defend Earth from alien invaders in this fast-paced space shooter. Upgrade your ship and save humanity!",
    image:
      "https://images.pexels.com/photos/2085831/pexels-photo-2085831.jpeg?auto=compress&cs=tinysrgb&w=800",
    genres: ["shooter", "action", "sci-fi"],
    url: "https://example.com/shooter",
    developer: "Example Dev",
    featured: true,
    trending: false,
    newRelease: false,
  },

  // Games without a Nostr pubkey (not yet publishing scores)
};

export const NO_PUBKEY_PREFIX = "nopubkey";

// Games to exclude from display (format: "<pubkey>:<game-identifier>")
// Add game keys here to hide them from the platform
export const EXCLUDED_GAMES: string[] = [
  "c4f5e7a75a8ce3683d529cff06368439c529e5243c6b125ba68789198856cac7:blockstr",
  "1ac4b360846e806952f2dd5a25d7af11287bacea731b69e8db63589bd7e97bbe:nostrich-run",
  "b9c858d8f59c4dd8f6ef62de02948b72e8502a3c82d79c2bcc4c8305e2989c6f:nostrich-run",
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

/**
 * Get all games without a Nostr pubkey from the config
 */
export function getNoPubkeyGames(customConfig?: GameConfigMap): Array<{
  key: string;
  pubkey: string;
  gameIdentifier: string;
  metadata: GameMetadata;
}> {
  return getAllGames(customConfig).filter((game) => isNoPubkeyGame(game.pubkey));
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
