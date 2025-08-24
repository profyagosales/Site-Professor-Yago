const express = require('express');
const Teacher = require('../models/Teacher');

const router = express.Router();

router.post('/seed-teacher', async (req, res) => {
  try {
    const hdr = req.headers['x-seed-token'];
    if (!hdr || hdr !== process.env.SEED_TOKEN) {
      return res.status(403).json({ ok: false });
    }
    const email = req.body?.email || 'yago@exemplo.com';
    const senha = req.body?.senha || '123456';
    const exists = await Teacher.findOne({ email });
    if (exists) return res.json({ ok: true, created: false });

    await Teacher.create({
      email,
      name: 'Professor Yago',
      password: senha,
    });
    return res.json({ ok: true, created: true });
  } catch (e) {
    console.error('[SEED] erro:', e);
    return res.status(500).json({ ok: false });
  }
});

module.exports = router;
