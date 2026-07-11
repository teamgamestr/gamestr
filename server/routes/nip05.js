import { Router } from 'express';
import { randomUUID } from 'crypto';
import { nip98Middleware } from '../lib/nip98.js';
import {
  createName,
  createOrder,
  getActiveName,
  getActiveNames,
  getActiveNamesByPubkey,
  getOrder,
  getPendingOrderByName,
  markOrderExpired,
  markOrderPaid,
  updateNameExpiry,
} from '../lib/db.js';
import { getServicePaymentInfo, getServicePubkey } from '../lib/nostr.js';

const router = Router();

const PRICE_SATS = parseInt(process.env.NIP05_PRICE_SATS || '10000', 10);
const ORDER_TIMEOUT_MS = parseInt(process.env.NIP05_ORDER_TIMEOUT_MS || '60000', 10);
const ORDER_TIMEOUT_SECONDS = Math.floor(ORDER_TIMEOUT_MS / 1000);
const TERM_SECONDS = 365 * 24 * 60 * 60; // 12 months

const RESERVED_NAMES = new Set([
  'admin', 'root', 'www', 'api', 'mail', 'ftp', 'localhost', 'gamestr', '_',
]);

const NAME_REGEX = /^[a-z0-9-_.]{2,32}$/;

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function isValidName(name) {
  if (!NAME_REGEX.test(name)) return false;
  if (RESERVED_NAMES.has(name)) return false;
  if (name.startsWith('-') || name.endsWith('-')) return false;
  if (name.startsWith('.') || name.endsWith('.')) return false;
  return true;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function parseJsonBody(req) {
  if (!req.body) return {};
  const text = Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : String(req.body);
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

router.get('/api/nip05/availability', (req, res) => {
  const rawName = normalizeName(String(req.query.name || ''));

  if (!rawName) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const valid = isValidName(rawName);
  const active = valid ? getActiveName(rawName) : null;
  const pubkey = typeof req.query.pubkey === 'string' ? req.query.pubkey : null;

  const available = valid && !active;
  const renewable = valid && !!active && active.pubkey === pubkey;

  return res.json({
    name: rawName,
    valid,
    available,
    renewable,
    priceSats: PRICE_SATS,
    termMonths: 12,
  });
});

router.post('/api/nip05/order', rawJsonMiddleware(), nip98Middleware(), (req, res) => {
  const body = parseJsonBody(req);
  const name = normalizeName(String(body.name || ''));
  const action = body.action === 'renew' ? 'renew' : 'new';
  const pubkey = req.nip98Pubkey;

  if (!isValidName(name)) {
    return res.status(400).json({ error: 'Invalid or reserved name' });
  }

  const now = nowSeconds();
  const activeName = getActiveName(name, now);

  if (action === 'new') {
    if (activeName) {
      return res.status(409).json({ error: 'Name is already taken' });
    }
    const existingPending = getPendingOrderByName(name);
    if (existingPending && existingPending.expires_at > now) {
      return res.status(409).json({ error: 'Name is currently reserved by another pending order' });
    }
  } else {
    if (!activeName) {
      return res.status(409).json({ error: 'Name does not exist or has expired' });
    }
    if (activeName.pubkey !== pubkey) {
      return res.status(403).json({ error: 'Name is not registered to your pubkey' });
    }
  }

  const orderId = randomUUID();
  const expiresAt = now + ORDER_TIMEOUT_SECONDS;

  createOrder({
    id: orderId,
    name,
    pubkey,
    action,
    status: 'pending',
    expiresAt,
  });

  const paymentInfo = getServicePaymentInfo();

  return res.status(201).json({
    order: {
      id: orderId,
      name,
      action,
      status: 'pending',
      expiresAt,
      createdAt: now,
    },
    payment: {
      amountSats: PRICE_SATS,
      amountMillisats: PRICE_SATS * 1000,
      pubkey: paymentInfo.pubkey,
      lud16: paymentInfo.lud16 || paymentInfo.fallbackLud16,
      lud06: paymentInfo.lud06,
      commentPrefix: 'NIP05:',
    },
  });
});

router.get('/api/nip05/order/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status === 'pending' && order.expires_at <= nowSeconds()) {
    markOrderExpired(order.id);
    order.status = 'expired';
  }

  return res.json({
    order: {
      id: order.id,
      name: order.name,
      action: order.action,
      status: order.status,
      expiresAt: order.expires_at,
      createdAt: order.created_at,
    },
  });
});

router.get('/api/nip05/names', (req, res) => {
  const pubkey = typeof req.query.pubkey === 'string' ? req.query.pubkey : null;
  let names;
  if (pubkey) {
    names = getActiveNamesByPubkey(pubkey);
  } else {
    names = getActiveNames();
  }

  return res.json({
    names: names.map((n) => ({ name: n.name, pubkey: n.pubkey, expiresAt: n.expires_at })),
  });
});

router.get('/api/nip05/service', async (_req, res) => {
  const paymentInfo = getServicePaymentInfo();
  return res.json(paymentInfo);
});

// NIP-05 well-known endpoint
router.get('/.well-known/nostr.json', (req, res) => {
  const name = normalizeName(String(req.query.name || ''));

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  const response = { names: {} };

  if (name && isValidName(name)) {
    const active = getActiveName(name);
    if (active) {
      response.names[name] = active.pubkey;
    }
  }

  return res.json(response);
});

export function handleZapReceipt({ zapRequest, senderPubkey, amountMillisats, comment }) {
  const orderId = extractOrderId(comment);
  if (!orderId) return null;

  const expectedAmount = PRICE_SATS * 1000;
  if (amountMillisats !== expectedAmount) {
    console.log(`[NIP-05] Zap amount mismatch for order ${orderId}: ${amountMillisats} msats`);
    return null;
  }

  const order = getOrder(orderId);
  if (!order) return null;
  if (order.status !== 'pending') return null;

  const now = nowSeconds();
  if (order.expires_at <= now) {
    markOrderExpired(order.id);
    return null;
  }

  if (order.pubkey !== senderPubkey) {
    console.log(`[NIP-05] Zap sender pubkey mismatch for order ${orderId}`);
    return null;
  }

  if (order.name !== extractNameFromComment(comment, order.name)) {
    // We only require the orderId to match; name is implicit from the order.
  }

  const paid = markOrderPaid(order.id);
  if (!paid) return null;

  const active = getActiveName(order.name, now);
  let expiresAt;
  if (active) {
    const base = Math.max(active.expires_at, now);
    expiresAt = base + TERM_SECONDS;
  } else {
    expiresAt = now + TERM_SECONDS;
  }

  if (active) {
    updateNameExpiry({ name: order.name, expiresAt, orderId: order.id });
  } else {
    createName({ name: order.name, pubkey: order.pubkey, expiresAt, orderId: order.id });
  }

  console.log(`[NIP-05] Order ${orderId} paid: ${order.name}@${getServicePubkey() ? 'gamestr.me' : 'example.com'}`);
  return { orderId, name: order.name, expiresAt };
}

function extractOrderId(comment) {
  if (!comment || typeof comment !== 'string') return null;
  const match = comment.match(/NIP05:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] || null;
}

function extractNameFromComment(comment, fallback) {
  if (!comment || typeof comment !== 'string') return fallback;
  const match = comment.match(/name=([a-z0-9-_.]+)/);
  return match?.[1] || fallback;
}

function rawJsonMiddleware() {
  return (req, res, next) => {
    if (req.is('application/json')) {
      req.setEncoding('utf-8');
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        req.body = Buffer.from(data, 'utf-8');
        next();
      });
      req.on('error', next);
      return;
    }
    next();
  };
}

export default router;
