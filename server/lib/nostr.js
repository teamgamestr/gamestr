import { SimplePool, verifyEvent, nip57 } from 'nostr-tools';
import { BOT_CONFIG } from '../botConfig.js';

const SERVICE_PUBKEY = process.env.NIP05_SERVICE_PUBKEY_HEX || '';
const FALLBACK_LUD16 = process.env.NIP05_FALLBACK_LUD16 || '';

const DEFAULT_RELAYS = [
  'wss://relay.gamestr.io',
  'wss://relay.ditto.pub',
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
];

const relays = Array.from(new Set([
  ...(BOT_CONFIG.subscribeRelays || []),
  ...(BOT_CONFIG.relays || []),
  ...DEFAULT_RELAYS,
]));

let pool = null;
let subscription = null;
let serviceProfile = null;
let serviceLnurl = null;

export function getServicePubkey() {
  return SERVICE_PUBKEY;
}

export function getRelays() {
  return relays;
}

export async function fetchServiceProfile() {
  if (!SERVICE_PUBKEY) return null;
  if (serviceProfile) return serviceProfile;

  if (!pool) pool = new SimplePool();

  try {
    const event = await Promise.race([
      pool.get(relays, { kinds: [0], authors: [SERVICE_PUBKEY], limit: 1 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
    ]);

    if (event) {
      let metadata = {};
      try {
        metadata = JSON.parse(event.content);
      } catch {
        metadata = {};
      }
      serviceProfile = {
        pubkey: SERVICE_PUBKEY,
        event,
        metadata,
        lud16: metadata.lud16 || null,
        lud06: metadata.lud06 || null,
      };
      return serviceProfile;
    }
  } catch (error) {
    console.warn('[NIP-05] Failed to fetch service profile:', error.message);
  }

  return null;
}

export function getServicePaymentInfo() {
  return {
    pubkey: SERVICE_PUBKEY,
    fallbackLud16: FALLBACK_LUD16,
    lud16: serviceProfile?.lud16 || null,
    lud06: serviceProfile?.lud06 || null,
  };
}

export async function fetchServiceLnurlMetadata() {
  if (serviceLnurl) return serviceLnurl;

  const profile = await fetchServiceProfile();
  const lud16 = profile?.lud16 || FALLBACK_LUD16;

  if (!lud16) {
    console.warn('[NIP-05] No lud16 configured for service account');
    return null;
  }

  const [name, domain] = lud16.split('@');
  if (!name || !domain) {
    console.warn('[NIP-05] Invalid lud16 format:', lud16);
    return null;
  }

  try {
    const res = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!body.allowsNostr || !body.nostrPubkey || !body.callback) {
      throw new Error('LNURL endpoint does not support Nostr zaps');
    }
    serviceLnurl = {
      callback: body.callback,
      nostrPubkey: body.nostrPubkey,
    };
    return serviceLnurl;
  } catch (error) {
    console.warn('[NIP-05] Failed to fetch service LNURL metadata:', error.message);
    return null;
  }
}

export function verifyZapRequest(event) {
  if (!event || event.kind !== 9734) return false;
  if (!verifyEvent(event)) return false;

  const pTags = event.tags.filter(([name]) => name === 'p');
  if (pTags.length !== 1) return false;
  if (pTags[0][1] !== SERVICE_PUBKEY) return false;

  const eTags = event.tags.filter(([name]) => name === 'e');
  const aTags = event.tags.filter(([name]) => name === 'a');
  if (eTags.length > 1 || aTags.length > 1) return false;

  return true;
}

export function parseZapReceipt(receipt) {
  if (!receipt || receipt.kind !== 9735) return null;
  if (!verifyEvent(receipt)) return null;
  if (serviceLnurl && receipt.pubkey !== serviceLnurl.nostrPubkey) return null;

  const descriptionTag = receipt.tags.find(([name]) => name === 'description')?.[1];
  if (!descriptionTag) return null;

  let zapRequest;
  try {
    zapRequest = JSON.parse(descriptionTag);
  } catch {
    return null;
  }

  if (!verifyZapRequest(zapRequest)) return null;

  const amountTag = zapRequest.tags.find(([name]) => name === 'amount')?.[1];
  const amountMillisats = amountTag ? parseInt(amountTag, 10) : null;

  return {
    receipt,
    zapRequest,
    senderPubkey: zapRequest.pubkey,
    amountMillisats,
    comment: zapRequest.content || '',
  };
}

export async function startZapReceiptMonitor(onReceipt) {
  if (!SERVICE_PUBKEY) {
    console.warn('[NIP-05] No service pubkey configured; zap monitor disabled');
    return;
  }

  if (subscription) return;

  const lnurl = await fetchServiceLnurlMetadata();
  if (!lnurl) {
    console.warn('[NIP-05] Could not load service LNURL metadata; zap monitor disabled');
    return;
  }

  if (!pool) pool = new SimplePool();

  subscription = pool.subscribeMany(
    relays,
    [{ kinds: [9735], '#p': [SERVICE_PUBKEY] }],
    {
      onevent: (event) => {
        const parsed = parseZapReceipt(event);
        if (parsed) {
          onReceipt(parsed).catch((error) => {
            console.error('[NIP-05] Error handling zap receipt:', error.message);
          });
        }
      },
      oneose: () => {
        console.log('[NIP-05] Zap receipt monitor caught up');
      },
      onerror: (error) => {
        console.error('[NIP-05] Zap receipt subscription error:', error);
      },
    }
  );

  console.log('[NIP-05] Zap receipt monitor started on', relays.length, 'relays');
}

export function stopZapReceiptMonitor() {
  if (subscription) {
    subscription.close();
    subscription = null;
  }
}

export async function resolveZapEndpoint() {
  const profile = await fetchServiceProfile();
  const lud16 = profile?.lud16 || FALLBACK_LUD16;

  if (!lud16) {
    throw new Error('No lightning address configured for NIP-05 service');
  }

  const syntheticEvent = {
    kind: 0,
    pubkey: SERVICE_PUBKEY,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({ lud16 }),
    tags: [],
    id: '',
    sig: '',
  };

  return nip57.getZapEndpoint(syntheticEvent);
}
