import { SimplePool, verifyEvent } from 'nostr-tools';
import { randomUUID } from 'crypto';
import {
  upsertFeaturedPlacement,
  createFeaturedRequest,
  deleteExpiredFeaturedPlacements,
} from '../lib/db.js';

// Recipient of featured-placement zaps (the Gamestr team account).
const GAMESTR_PUBKEY =
  process.env.GAMESTR_PUBKEY_HEX ||
  '5748fbe6ec0443e1f85b66351fe9cc2717014cf938acc968e7b20c9099802453';
const GAMESTR_LUD16 = process.env.GAMESTR_LUD16 || 'zaps@gamestr.io';
const PRICE_SATS_PER_MONTH = parseInt(
  process.env.FEATURED_PRICE_SATS_PER_MONTH || '21000',
  10,
);

const MONTH_SECONDS = 30 * 24 * 60 * 60;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const DEFAULT_RELAYS = [
  'wss://main.relay.gamestr.io',
  'wss://relay.ditto.pub',
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
];

const relays = Array.from(new Set(DEFAULT_RELAYS));

let pool = null;
let subscription = null;
let cleanupInterval = null;
let lnurlNostrPubkey = null;
const processedZapIds = new Set();

async function fetchLnurlMetadata() {
  const [name, domain] = GAMESTR_LUD16.split('@');
  if (!name || !domain) throw new Error(`Invalid lightning address: ${GAMESTR_LUD16}`);

  const res = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body.allowsNostr || !body.nostrPubkey || !body.callback) {
    throw new Error('LNURL endpoint does not support Nostr zaps');
  }
  lnurlNostrPubkey = body.nostrPubkey;
}

function parseComment(comment) {
  if (!comment || typeof comment !== 'string') return null;

  const monthsMatch = comment.match(/(\d+)\s*month/i);
  const months = monthsMatch ? Math.max(1, Math.min(12, parseInt(monthsMatch[1], 10))) : null;
  if (!months) return null;

  const gameMatch = comment.match(/\[feature-request\]\s*game=(\S+)/i);
  if (gameMatch) {
    return { type: 'game', gameKey: gameMatch[1], months };
  }

  const newGameMatch = comment.match(/\[feature-request\]\s*new game\s+"([^"]+)"\s+(\S+)/i);
  if (newGameMatch) {
    return { type: 'new-game', name: newGameMatch[1], url: newGameMatch[2], months };
  }

  return null;
}

export function handleFeaturedZapReceipt({ receipt, zapRequest, senderPubkey, amountMillisats, comment }) {
  if (!verifyEvent(receipt)) return null;
  if (lnurlNostrPubkey && receipt.pubkey !== lnurlNostrPubkey) return null;
  if (processedZapIds.has(receipt.id)) return null;

  const pTags = zapRequest.tags.filter(([name]) => name === 'p');
  if (pTags.length !== 1 || pTags[0][1] !== GAMESTR_PUBKEY) return null;

  const request = parseComment(comment);
  if (!request) return null;

  processedZapIds.add(receipt.id);

  const expectedMillisats = PRICE_SATS_PER_MONTH * request.months * 1000;
  if (!amountMillisats || amountMillisats < expectedMillisats) {
    console.log(
      `[Featured] Amount ${amountMillisats} msats below required ${expectedMillisats} msats (${request.months} month(s))`,
    );
    return null;
  }

  if (request.type === 'game') {
    const result = upsertFeaturedPlacement({
      gameKey: request.gameKey,
      payerPubkey: senderPubkey,
      months: request.months,
      zapId: receipt.id,
    });
    console.log(
      `[Featured] Placement activated for "${result.gameKey}" until ${new Date(result.expiresAt * 1000).toISOString()}`,
    );
    return { type: 'game', ...result };
  }

  // Unlisted game: store for manual review — cannot auto-feature a game
  // that has no listing yet.
  const id = randomUUID();
  createFeaturedRequest({
    id,
    name: request.name,
    url: request.url,
    payerPubkey: senderPubkey,
    months: request.months,
  });
  console.log(`[Featured] New-game request stored for review: "${request.name}" (${request.url})`);
  return { type: 'new-game', id };
}

export async function startFeaturedZapMonitor() {
  if (subscription) return;

  await fetchLnurlMetadata();

  if (!pool) pool = new SimplePool();

  subscription = pool.subscribeMany(
    relays,
    [{ kinds: [9735], '#p': [GAMESTR_PUBKEY] }],
    {
      onevent: (event) => {
        try {
          if (event.kind !== 9735) return;
          const descriptionTag = event.tags.find(([name]) => name === 'description')?.[1];
          if (!descriptionTag) return;

          const zapRequest = JSON.parse(descriptionTag);
          if (!verifyEvent(zapRequest)) return;

          const amountTag = zapRequest.tags.find(([name]) => name === 'amount')?.[1];

          handleFeaturedZapReceipt({
            receipt: event,
            zapRequest,
            senderPubkey: zapRequest.pubkey,
            amountMillisats: amountTag ? parseInt(amountTag, 10) : null,
            comment: zapRequest.content || '',
          });
        } catch (error) {
          console.error('[Featured] Error handling zap receipt:', error.message);
        }
      },
      oneose: () => {
        console.log('[Featured] Zap receipt monitor caught up');
      },
      onerror: (error) => {
        console.error('[Featured] Zap receipt subscription error:', error);
      },
    },
  );

  cleanupInterval = setInterval(() => {
    try {
      const removed = deleteExpiredFeaturedPlacements();
      if (removed > 0) {
        console.log(`[Featured] Cleanup: removed ${removed} expired placement(s)`);
      }
    } catch (error) {
      console.error('[Featured] Cleanup error:', error.message);
    }
  }, CLEANUP_INTERVAL_MS);

  console.log('[Featured] Zap receipt monitor started on', relays.length, 'relays');
}

export function stopFeaturedZapMonitor() {
  if (subscription) {
    subscription.close();
    subscription = null;
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
