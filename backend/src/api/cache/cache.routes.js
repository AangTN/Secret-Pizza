const express = require('express');
const { requireAdmin } = require('../../middleware/auth.middleware');
const { apiCache } = require('../../utils/cache');

const router = express.Router();

// Admin debug endpoint to inspect current cache counters and sizes.
router.get('/stats', requireAdmin, (req, res) => {
  res.status(200).json({ data: apiCache.getStats() });
});

// Reset stats counters; optional clear=true also clears all cache entries.
router.post('/stats/reset', requireAdmin, (req, res) => {
  const clearFromBody = req.body && req.body.clear === true;
  const clearFromQuery = String(req.query.clear || '').toLowerCase() === 'true';
  const shouldClearEntries = clearFromBody || clearFromQuery;

  let clearedEntries = 0;
  if (shouldClearEntries) {
    clearedEntries = apiCache.clear();
  }

  const stats = apiCache.resetStats({ resetStartedAt: true });

  res.status(200).json({
    message: shouldClearEntries
      ? 'Cache entries and stats have been reset'
      : 'Cache stats have been reset',
    data: {
      ...stats,
      clearedEntries,
    },
  });
});

module.exports = router;
