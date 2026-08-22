import { Router } from 'express';
import { getActivePlacements } from '../lib/db.js';

const router = Router();

router.get('/api/featured/placements', (_req, res) => {
  const placements = getActivePlacements().map((p) => ({
    gameKey: p.game_key,
    months: p.months,
    expiresAt: p.expires_at,
  }));
  return res.json({ placements });
});

export default router;
