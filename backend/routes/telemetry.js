const express = require('express');
const router = express.Router();

// POST /api/telemetry (no-op seguro)
router.post('/', express.json({ limit: '32kb' }), (req, res) => {
  try {
    const payload = req.body || {};
    if (process.env.DEBUG_TELEMETRY === '1') {
      // Resumir para evitar log gigante
      const { event, ts, essayId, step } = payload;
      // eslint-disable-next-line no-console
      console.log('[telemetry]', { event, ts, essayId, step });
    }
  } catch (e) {
    // swallow
  }
  res.json({ ok: true });
});

module.exports = router;