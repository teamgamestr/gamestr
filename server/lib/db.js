import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';

const DEFAULT_DB_PATH = join(process.cwd(), 'data', 'nip05.db');
const dbPath = process.env.DATABASE_PATH || DEFAULT_DB_PATH;

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS names (
    name TEXT PRIMARY KEY,
    pubkey TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    order_id TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_names_pubkey ON names(pubkey);
  CREATE INDEX IF NOT EXISTS idx_names_expires ON names(expires_at);

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pubkey TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_name_status ON orders(name, status);
  CREATE INDEX IF NOT EXISTS idx_orders_expires ON orders(expires_at);

  CREATE TABLE IF NOT EXISTS featured_placements (
    game_key TEXT PRIMARY KEY,
    payer_pubkey TEXT NOT NULL,
    months INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_zap_id TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_featured_placements_expires ON featured_placements(expires_at);

  CREATE TABLE IF NOT EXISTS featured_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    payer_pubkey TEXT NOT NULL,
    months INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );
`);

const nowSeconds = () => Math.floor(Date.now() / 1000);

// ===== Featured placements =====

export function getActivePlacement(gameKey, asOf = nowSeconds()) {
  const stmt = db.prepare('SELECT * FROM featured_placements WHERE game_key = ? AND expires_at > ?');
  return stmt.get(gameKey, asOf) || null;
}

export function getActivePlacements(asOf = nowSeconds()) {
  const stmt = db.prepare(`
    SELECT * FROM featured_placements WHERE expires_at > ?
    ORDER BY expires_at DESC
  `);
  return stmt.all(asOf);
}

export function upsertFeaturedPlacement({ gameKey, payerPubkey, months, zapId }) {
  const now = nowSeconds();
  const termSeconds = months * 30 * 24 * 60 * 60;
  const existing = getActivePlacement(gameKey);
  const expiresAt = existing
    ? Math.max(existing.expires_at, now) + termSeconds
    : now + termSeconds;
  const stmt = db.prepare(`
    INSERT INTO featured_placements (game_key, payer_pubkey, months, expires_at, created_at, updated_at, last_zap_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_key) DO UPDATE SET
      payer_pubkey = excluded.payer_pubkey,
      months = excluded.months,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at,
      last_zap_id = excluded.last_zap_id
  `);
  stmt.run(gameKey, payerPubkey, months, expiresAt, now, now, zapId || null);
  return { gameKey, expiresAt };
}

export function createFeaturedRequest({ id, name, url, payerPubkey, months }) {
  const now = nowSeconds();
  const stmt = db.prepare(`
    INSERT INTO featured_requests (id, name, url, payer_pubkey, months, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `);
  stmt.run(id, name, url, payerPubkey, months, now);
  return { id, name, url };
}

export function deleteExpiredFeaturedPlacements(asOf = nowSeconds()) {
  const stmt = db.prepare('DELETE FROM featured_placements WHERE expires_at <= ?');
  const result = stmt.run(asOf);
  return result.changes;
}

export function createName({ name, pubkey, expiresAt, orderId }) {
  const now = nowSeconds();
  const stmt = db.prepare(`
    INSERT INTO names (name, pubkey, expires_at, created_at, updated_at, order_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(name, pubkey, expiresAt, now, now, orderId || null);
  return { name, pubkey, expiresAt, orderId };
}

export function getName(name) {
  const stmt = db.prepare('SELECT * FROM names WHERE name = ?');
  return stmt.get(name) || null;
}

export function getActiveName(name, asOf = nowSeconds()) {
  const stmt = db.prepare('SELECT * FROM names WHERE name = ? AND expires_at > ?');
  return stmt.get(name, asOf) || null;
}

export function getActiveNames({ limit = 1000, offset = 0, asOf = nowSeconds() } = {}) {
  const stmt = db.prepare(`
    SELECT * FROM names WHERE expires_at > ?
    ORDER BY name ASC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(asOf, limit, offset);
}

export function getActiveNamesByPubkey(pubkey, asOf = nowSeconds()) {
  const stmt = db.prepare('SELECT * FROM names WHERE pubkey = ? AND expires_at > ? ORDER BY name ASC');
  return stmt.all(pubkey, asOf);
}

export function updateNameExpiry({ name, expiresAt, orderId }) {
  const stmt = db.prepare(`
    UPDATE names
    SET expires_at = ?, updated_at = ?, order_id = ?
    WHERE name = ?
  `);
  const result = stmt.run(expiresAt, nowSeconds(), orderId || null, name);
  return result.changes > 0;
}

export function deleteExpiredNames(asOf = nowSeconds()) {
  const stmt = db.prepare('DELETE FROM names WHERE expires_at <= ?');
  const result = stmt.run(asOf);
  return result.changes;
}

export function createOrder({ id, name, pubkey, action, status, expiresAt }) {
  const now = nowSeconds();
  const stmt = db.prepare(`
    INSERT INTO orders (id, name, pubkey, action, status, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, pubkey, action, status, expiresAt, now);
  return { id, name, pubkey, action, status, expiresAt, createdAt: now };
}

export function getOrder(id) {
  const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  return stmt.get(id) || null;
}

export function getPendingOrderByName(name) {
  const stmt = db.prepare(`
    SELECT * FROM orders
    WHERE name = ? AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return stmt.get(name) || null;
}

export function markOrderPaid(id) {
  const stmt = db.prepare("UPDATE orders SET status = 'paid' WHERE id = ? AND status = 'pending'");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function markOrderExpired(id) {
  const stmt = db.prepare("UPDATE orders SET status = 'expired' WHERE id = ? AND status = 'pending'");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function deleteOldOrders(asOf = nowSeconds()) {
  const stmt = db.prepare('DELETE FROM orders WHERE expires_at <= ?');
  const result = stmt.run(asOf);
  return result.changes;
}

export function closeDatabase() {
  db.close();
}
