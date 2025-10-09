const express = require('express');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');

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

router.post('/fix/missing-teachers', async (req, res) => {
  try {
    if (!process.env.MAINT_KEY || req.query?.key !== process.env.MAINT_KEY) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const classes = await Class.find({});
    let touched = 0;

    for (const cls of classes) {
      const teachers = Array.isArray(cls.teachers) ? cls.teachers : [];
      const before = teachers.length;
      let mutated = !Array.isArray(cls.teachers);

      if (mutated) {
        cls.teachers = teachers;
      }

      if (cls.createdBy && !teachers.some((t) => String(t) === String(cls.createdBy))) {
        teachers.push(cls.createdBy);
        mutated = true;
      }

      if (mutated || teachers.length !== before) {
        cls.teachers = teachers;
        await cls.save();
        touched += 1;
      }
    }

    return res.json({ success: true, fixed: touched });
  } catch (err) {
    console.error('[MAINT] erro ao corrigir turmas:', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

module.exports = router;
