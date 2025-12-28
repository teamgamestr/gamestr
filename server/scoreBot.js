/**
 * Score Bot - Nostr Score Announcement Bot
 * 
 * Subscribes to kind 30762 score events and publishes kind 1 notes
 * announcing new scores for games defined in gameConfig.
 * 
 * Features:
 * - Filters scores to only monitored games
 * - Differentiates between regular scores, top 3, and high scores
 * - Uses configurable templates for announcements
 * - Maintains high score cache to detect records
 */

import { SimplePool, finalizeEvent, getPublicKey, nip19 } from 'nostr-tools';
import {
  BOT_CONFIG,
  NOTE_TEMPLATES,
  isMonitoredGame,
  getMonitoredDeveloperPubkeys,
  formatScore,
  buildScoreLink,
  buildGameLink,
  getGameConfig,
} from './botConfig.js';
import {
  initializeCache,
  updateCache,
  isEventAnnounced,
  markEventAnnounced,
  loadExistingScores,
  getCacheStats,
} from './highScoreCache.js';

/**
 * The SimplePool instance for relay connections
 * @type {SimplePool | null}
 */
let pool = null;

/**
 * Active subscription reference
 * @type {object | null}
 */
let subscription = null;

/**
 * Bot's public key (derived from private key)
 * @type {string}
 */
let botPubkey = '';

/**
 * Parse a score event to extract relevant data
 * 
 * @param {object} event - Nostr event (kind 30762)
 * @returns {{ gameIdentifier: string, score: number, playerPubkey: string, level?: string, difficulty?: string } | null}
 */
function parseScoreEvent(event) {
  const getTag = (name) => event.tags.find(([n]) => n === name)?.[1];
  
  const gameIdentifier = getTag('game');
  const scoreStr = getTag('score');
  const playerPubkey = getTag('p');
  
  if (!gameIdentifier || !scoreStr || !playerPubkey) {
    return null;
  }
  
  const score = parseInt(scoreStr, 10);
  if (isNaN(score)) {
    return null;
  }
  
  return {
    gameIdentifier,
    score,
    playerPubkey,
    level: getTag('level'),
    difficulty: getTag('difficulty'),
  };
}

/**
 * Convert a hex pubkey to npub format for tagging
 * 
 * @param {string} pubkey - Hex pubkey
 * @returns {string} nostr:npub... format
 */
function pubkeyToNostrTag(pubkey) {
  try {
    const npub = nip19.npubEncode(pubkey);
    return `nostr:${npub}`;
  } catch {
    return pubkey;
  }
}

/**
 * Apply template variables to a note template
 * 
 * @param {string} template - The template string with {variable} placeholders
 * @param {object} vars - Variable values to substitute
 * @returns {string} The formatted note content
 */
function applyTemplate(template, vars) {
  let result = template;
  
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  
  return result;
}

/**
 * Publish a kind 1 note announcing a score
 * 
 * @param {string} content - The note content
 * @param {string} playerPubkey - Player to tag
 * @param {string} developerPubkey - Game developer to tag
 * @param {string} scoreEventId - Original score event to reference
 * @param {string | null} previousHolderPubkey - Previous high score holder to tag (optional)
 */
async function publishAnnouncement(content, playerPubkey, developerPubkey, scoreEventId, previousHolderPubkey = null) {
  if (!BOT_CONFIG.privateKey) {
    console.error('[ScoreBot] Cannot publish: no private key configured');
    return;
  }
  
  try {
    const privateKeyBytes = hexToBytes(BOT_CONFIG.privateKey);
    
    const tags = [
      // Tag the player
      ['p', playerPubkey],
      // Tag the game developer
      ['p', developerPubkey],
      // Reference the original score event
      ['e', scoreEventId, '', 'mention'],
      // Client tag
      ['client', 'gamestr-score-bot'],
    ];
    
    // Tag the previous high score holder if they got dethroned
    if (previousHolderPubkey) {
      tags.push(['p', previousHolderPubkey]);
    }
    
    const event = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags,
    };
    
    const signedEvent = finalizeEvent(event, privateKeyBytes);
    
    await Promise.allSettled(
      pool.publish(BOT_CONFIG.relays, signedEvent)
    );
    
    console.log(`[ScoreBot] Published announcement: ${signedEvent.id.slice(0, 8)}...`);
  } catch (error) {
    console.error('[ScoreBot] Failed to publish announcement:', error.message);
  }
}

/**
 * Convert a hex string to Uint8Array
 * 
 * @param {string} hex - Hex string
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Process a new score event
 * 
 * @param {object} event - Nostr event (kind 30762)
 */
async function processScoreEvent(event) {
  // Skip if already announced
  if (isEventAnnounced(event.id)) {
    return;
  }
  
  // Parse the score event
  const parsed = parseScoreEvent(event);
  if (!parsed) {
    console.log(`[ScoreBot] Skipping malformed score event: ${event.id.slice(0, 8)}...`);
    return;
  }
  
  const { gameIdentifier, score, playerPubkey, level, difficulty } = parsed;
  const developerPubkey = event.pubkey;
  
  // Check if this game is monitored
  if (!isMonitoredGame(developerPubkey, gameIdentifier)) {
    return;
  }
  
  const gameKey = `${developerPubkey}:${gameIdentifier}`;
  
  // Get game metadata
  const gameConfig = getGameConfig();
  const gameMetadata = gameConfig[gameKey];
  const gameName = gameMetadata?.name || gameIdentifier;
  
  // Update the cache and get ranking info
  const { isHighScore, isTopThree, rank, previousHolder } = updateCache(
    gameKey,
    score,
    playerPubkey,
    event.id,
    event.created_at
  );
  
  // Mark as announced to prevent duplicates
  markEventAnnounced(event.id);
  
  // Build template variables
  const templateVars = {
    playerTag: pubkeyToNostrTag(playerPubkey),
    gameTag: pubkeyToNostrTag(developerPubkey),
    gameName,
    score: formatScore(score),
    scoreRaw: score.toString(),
    scoreLink: buildScoreLink(developerPubkey, gameIdentifier, event.id),
    gameLink: buildGameLink(developerPubkey, gameIdentifier),
    level: level || '',
    difficulty: difficulty || '',
    rank: rank?.toString() || '',
    previousHolderTag: previousHolder ? pubkeyToNostrTag(previousHolder.playerPubkey) : '',
    previousScore: previousHolder ? formatScore(previousHolder.score) : '',
  };
  
  // Select the appropriate template and determine who to tag
  let template;
  let previousHolderPubkey = null;
  
  if (isHighScore) {
    if (previousHolder) {
      // Someone got dethroned - use the highScore template
      template = NOTE_TEMPLATES.highScore;
      previousHolderPubkey = previousHolder.playerPubkey;
      console.log(`[ScoreBot] NEW HIGH SCORE: ${gameName} - ${formatScore(score)} by ${playerPubkey.slice(0, 8)}... (dethroned ${previousHolder.playerPubkey.slice(0, 8)}...)`);
    } else {
      // First high score for this game - use the firstHighScore template
      template = NOTE_TEMPLATES.firstHighScore;
      console.log(`[ScoreBot] FIRST HIGH SCORE: ${gameName} - ${formatScore(score)} by ${playerPubkey.slice(0, 8)}...`);
    }
  } else if (isTopThree && rank && rank <= 3) {
    template = NOTE_TEMPLATES.topScore;
    console.log(`[ScoreBot] TOP ${rank}: ${gameName} - ${formatScore(score)} by ${playerPubkey.slice(0, 8)}...`);
  } else {
    template = NOTE_TEMPLATES.newScore;
    console.log(`[ScoreBot] New score: ${gameName} - ${formatScore(score)} by ${playerPubkey.slice(0, 8)}...`);
  }
  
  // Apply template and publish
  const content = applyTemplate(template, templateVars);
  await publishAnnouncement(content, playerPubkey, developerPubkey, event.id, previousHolderPubkey);
}

/**
 * Initialize the cache by loading existing scores from relays
 */
async function loadExistingScoresFromRelays() {
  console.log('[ScoreBot] Loading existing scores from relays...');
  
  const developerPubkeys = getMonitoredDeveloperPubkeys();
  
  if (developerPubkeys.length === 0) {
    console.log('[ScoreBot] No developer pubkeys to monitor');
    return;
  }
  
  console.log(`[ScoreBot] Querying relays: ${BOT_CONFIG.subscribeRelays.join(', ')}`);
  console.log(`[ScoreBot] Looking for scores from ${developerPubkeys.length} developers`);
  
  // Use subscription-based approach instead of querySync for reliability
  const events = [];
  
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log(`[ScoreBot] Query timeout reached, collected ${events.length} events`);
        resolve();
      }, 10000); // 10 second timeout
      
      let eoseCount = 0;
      const relayCount = BOT_CONFIG.subscribeRelays.length;
      
      const sub = pool.subscribeMany(
        BOT_CONFIG.subscribeRelays,
        [
          {
            kinds: [30762],
            authors: developerPubkeys,
            limit: 500,
          },
        ],
        {
          onevent: (event) => {
            events.push(event);
          },
          oneose: () => {
            eoseCount++;
            console.log(`[ScoreBot] EOSE received (${eoseCount}/${relayCount})`);
            if (eoseCount >= relayCount) {
              clearTimeout(timeout);
              sub.close();
              resolve();
            }
          },
          onerror: (err) => {
            console.error('[ScoreBot] Subscription error:', err);
          },
        }
      );
    });
    
    console.log(`[ScoreBot] Fetched ${events.length} existing score events`);
    
    // Parse and load into cache
    const scores = [];
    for (const event of events) {
      const parsed = parseScoreEvent(event);
      if (!parsed) continue;
      
      const { gameIdentifier, score, playerPubkey } = parsed;
      const gameKey = `${event.pubkey}:${gameIdentifier}`;
      
      // Only include monitored games
      if (!isMonitoredGame(event.pubkey, gameIdentifier)) continue;
      
      scores.push({
        gameKey,
        score,
        playerPubkey,
        eventId: event.id,
        timestamp: event.created_at,
      });
    }
    
    loadExistingScores(scores);
  } catch (error) {
    console.error('[ScoreBot] Failed to load existing scores:', error.message);
  }
}

/**
 * Start the score bot
 */
export async function startScoreBot() {
  if (!BOT_CONFIG.enabled) {
    console.log('[ScoreBot] Bot is disabled (no SCORE_BOT_PRIVATE_KEY set)');
    return;
  }
  
  console.log('[ScoreBot] Starting score announcement bot...');
  
  try {
    // Derive bot pubkey
    const privateKeyBytes = hexToBytes(BOT_CONFIG.privateKey);
    botPubkey = getPublicKey(privateKeyBytes);
    const npub = nip19.npubEncode(botPubkey);
    console.log(`[ScoreBot] Bot pubkey: ${npub}`);
  } catch (error) {
    console.error('[ScoreBot] Invalid private key:', error.message);
    return;
  }
  
  // Initialize the relay pool
  pool = new SimplePool();
  
  // Initialize the high score cache
  initializeCache();
  
  // Load existing scores to populate cache
  await loadExistingScoresFromRelays();
  
  const stats = getCacheStats();
  console.log(`[ScoreBot] Cache initialized: ${stats.gamesTracked} games, ${stats.totalHighScores} high scores tracked`);
  
  // Get developer pubkeys to monitor
  const developerPubkeys = getMonitoredDeveloperPubkeys();
  
  if (developerPubkeys.length === 0) {
    console.log('[ScoreBot] No games to monitor');
    return;
  }
  
  console.log(`[ScoreBot] Monitoring ${developerPubkeys.length} game developers`);
  console.log(`[ScoreBot] Subscribe relays: ${BOT_CONFIG.subscribeRelays.join(', ')}`);
  console.log(`[ScoreBot] Publish relays: ${BOT_CONFIG.relays.join(', ')}`);
  
  // Subscribe to score events
  subscription = pool.subscribeMany(
    BOT_CONFIG.subscribeRelays,
    [
      {
        kinds: [30762],
        authors: developerPubkeys,
        since: Math.floor(Date.now() / 1000), // Only new scores from now
      },
    ],
    {
      onevent: (event) => {
        processScoreEvent(event).catch(error => {
          console.error('[ScoreBot] Error processing score event:', error.message);
        });
      },
      oneose: () => {
        console.log('[ScoreBot] Subscription caught up, now listening for new scores...');
      },
    }
  );
  
  console.log('[ScoreBot] Score bot started successfully');
}

/**
 * Stop the score bot
 */
export function stopScoreBot() {
  if (subscription) {
    subscription.close();
    subscription = null;
  }
  
  if (pool) {
    pool.close(BOT_CONFIG.relays);
    pool.close(BOT_CONFIG.subscribeRelays);
    pool = null;
  }
  
  console.log('[ScoreBot] Score bot stopped');
}

/**
 * Get bot status for health checks
 * 
 * @returns {{ enabled: boolean, running: boolean, pubkey: string, stats: object }}
 */
export function getBotStatus() {
  return {
    enabled: BOT_CONFIG.enabled,
    running: !!subscription,
    pubkey: botPubkey,
    stats: getCacheStats(),
  };
}
