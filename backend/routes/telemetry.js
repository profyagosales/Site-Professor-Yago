const express = require('express');
const router = express.Router();
const TelemetryEvent = require('../models/TelemetryEvent');
const authMod = require('../middleware/auth');
const authRequired = typeof authMod === 'function' ? authMod : authMod.authRequired;

const STORE_ENABLED = process.env.TELEMETRY_STORE === '1';
const TTL_DAYS = Number(process.env.TELEMETRY_TTL_DAYS || 7);

// POST /api/telemetry (no-op seguro)
router.post('/', express.json({ limit: '32kb' }), async (req, res) => {
  try {
    const raw = req.body || {};
    const payload = typeof raw === 'object' ? raw : {};
    if (process.env.DEBUG_TELEMETRY === '1') {
      // Resumir para evitar log gigante
      const { event, ts, essayId, step } = payload;
      // eslint-disable-next-line no-console
      console.log('[telemetry]', { event, ts, essayId, step });
    }
    if (STORE_ENABLED) {
      try {
        const capped = JSON.parse(JSON.stringify(payload));
        // Aparar payload a ~32kB
        const s = JSON.stringify(capped);
        let final = capped;
        if (s.length > 32 * 1024) {
          final = { truncated: true, size: s.length };
        }
        const ua = req.headers['user-agent'] || null;
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
        const doc = {
          event: String(payload.event || 'unknown'),
          message: payload.message ? String(payload.message).slice(0, 500) : null,
          payload: final,
          ua,
          ip,
          createdAt: new Date()
        };
        await TelemetryEvent.create(doc);
      } catch (e) {
        // não quebrar a rota por falha de log
      }
    }
  } catch (e) {
    // swallow
  }
  res.json({ ok: true });
});

// GET /api/telemetry/latest?limit=100 (somente admin)
router.get('/latest', authRequired, async (req, res) => {
  try {
    const role = req?.user?.role || req?.profile;
    if (role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
    const items = await TelemetryEvent.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, items });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Expurgo simples (se habilitado)
if (STORE_ENABLED) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const runPurge = async () => {
    try {
      const cutoff = new Date(Date.now() - TTL_DAYS * ONE_DAY_MS);
      await TelemetryEvent.deleteMany({ createdAt: { $lt: cutoff } });
    } catch (_) { /* noop */ }
  };
  // roda a cada 24h
  setInterval(runPurge, ONE_DAY_MS).unref?.();
  // primeira tentativa agendada em 1 minuto para não impactar boot
  setTimeout(runPurge, 60 * 1000).unref?.();
}

module.exports = router;