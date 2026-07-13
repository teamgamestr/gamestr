import { verifyEvent } from 'nostr-tools';
import { createHash } from 'crypto';

const TIME_WINDOW_MS = 60_000;

function parseAuthHeader(header) {
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'nostr' || !token) return null;
  try {
    const json = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getTagValue(event, name) {
  const tag = event.tags?.find(([tagName]) => tagName === name);
  return tag?.[1];
}

function computeBodyHash(body) {
  if (!body) return null;
  const data = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf-8');
  return createHash('sha256').update(data).digest('hex');
}

export function nip98Middleware() {
  return (req, res, next) => {
    const event = parseAuthHeader(req.headers.authorization);

    if (!event) {
      return res.status(401).json({ error: 'Missing or invalid Nostr authorization header' });
    }

    // Basic event validation
    if (event.kind !== 27235) {
      return res.status(401).json({ error: 'Invalid NIP-98 event kind' });
    }

    const nowMs = Date.now();
    const createdAtMs = event.created_at * 1000;
    if (Math.abs(nowMs - createdAtMs) > TIME_WINDOW_MS) {
      return res.status(401).json({ error: 'NIP-98 event timestamp outside allowed window' });
    }

    if (!verifyEvent(event)) {
      return res.status(401).json({ error: 'Invalid NIP-98 event signature' });
    }

    const uTag = getTagValue(event, 'u');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const expectedUrl = `${protocol}://${req.get('host')}${req.originalUrl}`;
    if (uTag !== expectedUrl) {
      return res.status(401).json({ error: 'NIP-98 u tag mismatch' });
    }

    const methodTag = getTagValue(event, 'method');
    if (methodTag !== req.method) {
      return res.status(401).json({ error: 'NIP-98 method mismatch' });
    }

    const payloadTag = getTagValue(event, 'payload');
    if (payloadTag) {
      const bodyHash = computeBodyHash(req.body);
      if (bodyHash && bodyHash !== payloadTag) {
        return res.status(401).json({ error: 'NIP-98 payload hash mismatch' });
      }
    }

    req.nip98Pubkey = event.pubkey;
    next();
  };
}
