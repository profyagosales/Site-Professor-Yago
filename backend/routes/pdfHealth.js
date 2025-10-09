const express = require('express');
const authMod = require('../middleware/auth');
const authRequired = typeof authMod === 'function' ? authMod : authMod.authRequired;
const Essay = require('../models/Essay');
const { assertUserCanAccessEssay } = require('../utils/assertUserCanAccessEssay');
const fileController = require('../controllers/fileController');

const router = express.Router();

// HEAD /api/essays/:id/file  (health-light)
router.head('/essays/:id/file', authRequired, async (req, res, next) => {
  try {
    const essay = await Essay.findById(req.params.id).select('originalUrl classId studentId').lean();
    if (!essay) return res.status(404).end();
    await assertUserCanAccessEssay(req.user, essay);
    const meta = await fileController.getFileMeta(req.params.id);
    res.set({
      'Content-Type': meta.contentType || 'application/pdf',
      ...(meta.length ? { 'Content-Length': meta.length } : {}),
      'Cache-Control': 'private, max-age=60'
    });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;