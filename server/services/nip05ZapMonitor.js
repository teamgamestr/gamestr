import { startZapReceiptMonitor, stopZapReceiptMonitor } from '../lib/nostr.js';
import { handleZapReceipt } from '../routes/nip05.js';
import { deleteExpiredNames, deleteOldOrders } from '../lib/db.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let cleanupInterval = null;

export async function startNIP05ZapMonitor() {
  await startZapReceiptMonitor(async (parsed) => {
    const result = handleZapReceipt(parsed);
    if (result) {
      console.log(`[NIP-05] Name claimed/renewed via zap: ${result.name}`);
    }
  });

  cleanupInterval = setInterval(() => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiredNames = deleteExpiredNames(now);
      const oldOrders = deleteOldOrders(now);
      if (expiredNames > 0 || oldOrders > 0) {
        console.log(`[NIP-05] Cleanup: removed ${expiredNames} expired names and ${oldOrders} old orders`);
      }
    } catch (error) {
      console.error('[NIP-05] Cleanup error:', error.message);
    }
  }, CLEANUP_INTERVAL_MS);
}

export function stopNIP05ZapMonitor() {
  stopZapReceiptMonitor();
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
