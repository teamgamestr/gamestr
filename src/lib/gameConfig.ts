/**
 * Game metadata configuration
 * Maps <developer-pubkey>:<game-identifier> to game metadata
 */

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
};

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
  return config[key] || FALLBACK_GAME_METADATA;
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
