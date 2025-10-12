// backend/routes/session.js
const express = require('express');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/me
 * 200 com usuário normalizado se autenticado; 401 caso contrário.
 */
router.get('/me', authOptional, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const { _id, id, role, email, name } = req.user || {};
  return res.json({
    success: true,
    user: {
      id: String(_id || id || ''),
      role: role || req.profile || null,
      email: email || null,
      name: name || null,
    },
  });
});

/**
 * POST /api/logout
 * Limpa cookies de autenticação usando os mesmos atributos (Domain, Secure, SameSite) definidos no app.js.
 */
router.post('/logout', authOptional, (req, res) => {
  res.clearCookie('token');
  res.clearCookie('access_token');
  return res.json({ success: true });
});

module.exports = router;
