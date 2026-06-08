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
  leaderboardSplit?: LeaderboardSplitConfig;
}

export interface GameConfigMap {
  [key: string]: GameMetadata; // key format: "<pubkey>:<game-identifier>"
}

export type ScoreDirection = "desc" | "asc";

/**
 * How a board's score value is displayed.
 * - "number": formatted with thousands separators (default)
 * - "time": numeric value interpreted as a duration and rendered as m:ss(.xx)
 */
export type ScoreFormat = "number" | "time";

export interface LeaderboardConfig {
  label: string;
  scoreTag: string;
  direction: ScoreDirection;
  displayTag?: string;
  displayLabel?: string;
  /** Restrict this board to events whose `filterTag` equals `filterValue`. */
  filterTag?: string;
  filterValue?: string;
  /** How to render the score value (defaults to "number"). */
  scoreFormat?: ScoreFormat;
  /** Input units for the score when scoreFormat is "time" (defaults to "s"). */
  scoreUnit?: "ms" | "s";
}

/**
 * Declares a set of per-value leaderboards split by a single event tag.
 * Example: BTC Rally splits the `score` (lap time) by the `level` tag, one
 * board per track. Each entry in `values` becomes its own LeaderboardConfig.
 */
export interface LeaderboardSplitConfig {
  /** Event tag whose value selects the board, e.g. "level". */
  splitTag: string;
  /** Tag the score is read from (defaults to "score"). */
  scoreTag?: string;
  direction: ScoreDirection;
  scoreFormat?: ScoreFormat;
  scoreUnit?: "ms" | "s";
  /** Layout hint for the UI. "tabs" renders a scrollable tab row. */
  layout?: "tabs" | "grid";
  /** Ordered list of split values mapped to friendly labels. */
  values: { value: string; label: string }[];
}

/**
 * Format a raw score value for display according to a board's preferences.
 * "time" interprets the value as a duration (in scoreUnit, default "s") and
 * renders it as m:ss.xx (or s.xx under a minute). Everything else uses commas.
 */
export function formatScoreValue(
  value: number,
  prefs?: { scoreFormat?: ScoreFormat; scoreUnit?: "ms" | "s" },
): string {
  if (prefs?.scoreFormat === "time") {
    const totalSeconds = prefs.scoreUnit === "ms" ? value / 1000 : value;
    if (!isFinite(totalSeconds) || totalSeconds < 0) return value.toLocaleString();
    // Round to centiseconds first so rounding carries into minutes correctly
    // (e.g. 119.999s -> "2:00.00", never "1:60.00").
    const totalCentis = Math.round(totalSeconds * 100);
    const minutes = Math.floor(totalCentis / 6000);
    const seconds = (totalCentis % 6000) / 100;
    if (minutes > 0) {
      return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
    }
    return `${seconds.toFixed(2)}s`;
  }
  return value.toLocaleString();
}

/**
 * Derive the score display preferences for a game from its metadata.
 * Reads from `leaderboardSplit`, or a single `leaderboards` entry. Returns
 * undefined when the game uses the default numeric display.
 */
export function getScoreDisplayPrefs(
  metadata?: Pick<GameMetadata, "leaderboards" | "leaderboardSplit">,
): { scoreFormat?: ScoreFormat; scoreUnit?: "ms" | "s"; direction?: ScoreDirection } | undefined {
  if (!metadata) return undefined;
  if (metadata.leaderboardSplit) {
    return {
      scoreFormat: metadata.leaderboardSplit.scoreFormat,
      scoreUnit: metadata.leaderboardSplit.scoreUnit,
      direction: metadata.leaderboardSplit.direction,
    };
  }
  if (metadata.leaderboards?.length === 1) {
    return {
      scoreFormat: metadata.leaderboards[0].scoreFormat,
      scoreUnit: metadata.leaderboards[0].scoreUnit,
      direction: metadata.leaderboards[0].direction,
    };
  }
  return undefined;
}

/**
 * Resolve the list of leaderboard boards for a game's metadata.
 * Prefers an explicit `leaderboards` array; otherwise expands a
 * `leaderboardSplit` declaration into one board per split value.
 */
export function resolveLeaderboards(
  metadata: Pick<GameMetadata, "leaderboards" | "leaderboardSplit">,
): LeaderboardConfig[] {
  if (metadata.leaderboards && metadata.leaderboards.length > 0) {
    return metadata.leaderboards;
  }
  const split = metadata.leaderboardSplit;
  if (split && split.values.length > 0) {
    return split.values.map((v) => ({
      label: v.label,
      scoreTag: split.scoreTag ?? "score",
      direction: split.direction,
      filterTag: split.splitTag,
      filterValue: v.value,
      scoreFormat: split.scoreFormat,
      scoreUnit: split.scoreUnit,
    }));
  }
  return [];
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
      developer:
        "npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc",
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
  image: "/gamestr-logo.svg",
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
    image: "/blockstr-logo.png",
    genres: ["arcade", "casual", "retro"],
    url: "https://blockstr.io",
    developer:
      "npub1jwh6vzw5tzpwh6g79m72grzae5hsv99f3x9v3l35uux477m6lk9slqhpvc",
    featured: true,
    trending: false,
    newRelease: false,
  },

  //Sats-Man
  "5a625acc4312b5b56c735e7eb0fa48521ec9a5fe72bef0015b0ca62f3c4e09b6:sats-man": {
    name: "Sats-Man",
    description: "A Bitcoin-themed Pac-Man style arcade game on Nostr.",
    image: "https://sats-man.com/sats-man-logo.png",
    genres: ["arcade", "casual", "retro"],
    url: "https://sats-man.com",
    developer:
      "npub1jwh6vzw5tzpwh6g79m72grzae5hsv99f3x9v3l35uux477m6lk9slqhpvc",
    featured: false,
    trending: false,
    newRelease: true,
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
      developer:
        "npub1sfpeyr9k5jms37q4900mw9q4vze4xwhdxd4avdxjml8rqgjkre8s4lcq9l",
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
      url: "https://nostrichrun.whitepaperinteractive.com",
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
  "f02da534c04a14ec5d11bec66b494543e3f6aa839a5f7e8a756475e6601ae18a:btc-proof-of-play":
    {
      name: "BTC Proof of Play",
      description:
        "BTC: Proof of Play is a 1v1 Bitcoin-inspired strategy card game where players build decks, battle head-to-head, earn Sparks and Shards, unlock cards and cosmetics, and optionally use Lightning for tips and purchases. It is Bitcoin-themed, but it is not built on a blockchain and does not use NFTs or on-chain gameplay. Bitcoin ONLY.",
      image:
        "https://images.squarespace-cdn.com/content/v1/68d64bc3e0c99d41729d22a1/de8349cc-e14d-4b6d-a5c3-b79e8062006d/BTCG+Logo+V2_cropped.png?format=800w",
      genres: ["card", "strategy", "player v player"],
      url: "https://btcproofofplay.itch.io/btcproofofplay",
      developer:
        "npub17qk62dxqfg2wchg3hmrxkj29g03ld25rnf0hazn4v367vcq6ux9qw485cc",
      featured: true,
      trending: false,
      newRelease: true,
    },

  // Pallasite
  "fa9291d038fd1d3e4439364f289f2e53a64a1d32776ee52c000da53ebc718cdc:pallasite":
    {
      name: "Pallasite",
      description:
        "Shoot rocks, stack sats. A cosmic arcade shooter with Lightning sats and Nostr leaderboards.",
      image: "https://pallasite.app/icon-512.png",
      genres: ["arcade", "shooter", "action"],
      url: "https://pallasite.app",
      developer:
        "npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2",
      featured: true,
      trending: true,
      newRelease: true,
    },

  // BTC Rally
  "bb1f62f00f67dec2182ac7c40d046979d7c8ca698951cb9e509bdcb3d0a85f8a:btcrally": {
    name: "BTC Rally",
    description:
      "A Kart-style racing game with integrated Bitcoin support. Challenge friends in local split-screen mode — everyone pays a few sats to enter, and the winners take the majority of the prize pot. Powered by ZBD or LNBits.",
    image:
      "https://img.itch.zone/aW1nLzIyMzY5MTgyLnBuZw==/original/aKuWbq.png",
    genres: ["racing", "multiplayer", "action"],
    url: "https://mandelduckstudio.itch.io/btcrally",
    developer:
      "npub1yreyumw0xrc2mz324ul44c8pr2ellmg7t904h0e62kx5h53z6nnqm6q23f",
    featured: true,
    trending: false,
    newRelease: true,
    leaderboardSplit: {
      splitTag: "level",
      scoreTag: "score",
      direction: "asc",
      scoreFormat: "time",
      scoreUnit: "ms",
      layout: "tabs",
      values: [
        { value: "VillageScene_V2", label: "Satoshi Village" },
        { value: "RaceTrackScene_V2", label: "ZBD Speedway" },
        { value: "FrontierScene_V2", label: "Klondike" },
        { value: "RainbowRoadScene_V2", label: "Ritchie's Road" },
        { value: "Halloween_V2", label: "PUMP'kin Crypt" },
        { value: "ArtScene_V2", label: "Atelier" },
        { value: "TokyoScene_V2", label: "Tokyo" },
      ],
    },
  },

  // Forge Realms
  "b1a7a47a0abb87c8913c431f5ebdfce45532d26db4b61c85373048d44d1324b9:forge-realms":
    {
      name: "Forge Realms",
      description:
        "A Stone Age RTS. Build, gather, raid, and advance from a fragile village into a conquering realm.",
      image:
        "https://forgesworn.dev/forge-realms/assets/ui/start-page-v1.webp",
      genres: ["strategy", "simulation", "multiplayer"],
      url: "https://forgesworn.dev/forge-realms/",
      developer:
        "npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2",
      featured: true,
      trending: false,
      newRelease: true,
    },

  // Player-signed games (kind 30762, no developer pubkey)
  "nopubkey:wordswithzaps": {
    name: "Words With Zaps",
    description:
      "A competitive word game powered by zaps. Form words, score points, and zap your way to victory!",
    image: "https://wordswithzaps.top/wwz_gamestr.png",
    genres: ["puzzle", "casual", "player v player"],
    url: "https://wordswithzaps.top",
    developer:
      "npub1aeh2zw4elewy5682lxc6xnlqzjnxksq303gwu2npfaxd49vmde6qcq4nwx",
    featured: true,
    trending: true,
    newRelease: true,
    playerSigned: true,
    leaderboards: [
      { label: "Score", scoreTag: "score", direction: "desc" },
      {
        label: "Highest Word",
        scoreTag: "score:highestword",
        direction: "desc",
        displayTag: "highestword",
        displayLabel: "Word",
      },
    ],
  },

  // noGames Miner
  "nopubkey:nogames-miner-v1": {
    name: "Miner",
    description:
      "The classic Gold Miner — your claw swings on a pendulum, you release it at the right moment, and it reels back loot from the cavern below. Swing the hook. Pull up gold. Dodge the stones.",
    image:
      "https://cdn.hzrd149.com/a4e13e0101d63ca405d6f38b5d69f30de5ddec58aeb803276f03730c25be5cce.svg",
    genres: ["arcade", "casual", "puzzle"],
    url: "https://npub1n0games63frevnx3llju3sypf2q4streuwzgr4wwd2y5hlqa5c9s29nfk3.nsite.lol/game/naddr1qvzqqqyp7vpzpx73mhnp4zj8jexdrll9erqgzj5ptqk8ncuys82uu65ff07pmfstqqyx66twv4ez6a33wmgevg",
    developer:
      "npub1n0games63frevnx3llju3sypf2q4streuwzgr4wwd2y5hlqa5c9s29nfk3",
    featured: false,
    trending: false,
    newRelease: true,
    playerSigned: true,
  },

  // noGames Snake
  "nopubkey:nogames-snake-v1": {
    name: "Snake",
    description:
      "The classic, reimagined. Slip through walls, grab the golden apple, don't bite yourself. Walls wrap, golden apples appear for bonus points, and the snake speeds up as you grow.",
    image:
      "https://cdn.hzrd149.com/e19b12222085fa5fdc359f6d74acdcf8bbbbb310a1673542727552beda098340.svg",
    genres: ["arcade", "casual"],
    url: "https://npub1n0games63frevnx3llju3sypf2q4streuwzgr4wwd2y5hlqa5c9s29nfk3.nsite.lol/game/naddr1qvzqqqyp7vpzpx73mhnp4zj8jexdrll9erqgzj5ptqk8ncuys82uu65ff07pmfstqqy8xmnpddjj6a33ae9uxl",
    developer:
      "npub1n0games63frevnx3llju3sypf2q4streuwzgr4wwd2y5hlqa5c9s29nfk3",
    featured: false,
    trending: false,
    newRelease: true,
    playerSigned: true,
  },
};

// Generate a hash from game configuration content
// This ensures version changes automatically when config is modified
function generateConfigHash(config: GameConfigMap): string {
  const configString = JSON.stringify(config);
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
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
  "asteroid-sats",
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
