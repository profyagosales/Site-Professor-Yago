const express = require('express');
const auth = require('../middleware/auth');
const Theme = require('../models/Theme');

const router = express.Router();

// GET /themes?q=
router.get('/', auth.authRequired, async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString();
    const filter = q ? { name: { $regex: `^${q}`, $options: 'i' } } : {};
    const themes = await Theme.find(filter).sort({ name: 1 }).select('_id name').lean();
    res.json(themes.map(t => ({ id: String(t._id), name: t.name })));
  } catch (err) { next(err); }
});

// POST /themes { name }
router.post('/', auth.authRequired, async (req, res, next) => {
  try {
    const name = (req.body && req.body.name || '').toString().trim();
    if (!name) return res.status(400).json({ message: 'name required' });
    const theme = await Theme.create({ name, createdBy: req.user ? req.user._id : undefined });
    res.status(201).json({ id: String(theme._id), name: theme.name });
  } catch (err) {
    if (err && err.code === 11000) {
      res.status(409).json({ message: 'duplicate' });
    } else next(err);
  }
});

module.exports = router;
