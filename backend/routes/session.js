// backend/routes/session.js
const express = require('express');
const { authOptional } = require('../middleware/auth');
const { readSession } = require('../middleware/authn');

const router = express.Router();

/**
 * GET /api/me
 * 200 com usuário normalizado se autenticado; 401 caso contrário.
 */
router.get('/me', readSession, (req, res) => {
  const sessionUser = req.sessionUser || req.user;
  if (!sessionUser) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const {
    _id,
    id,
    sub,
    role: rawRole,
    email,
    name,
    nome,
    isTeacher,
    photo,
    photoUrl: rawPhotoUrl,
  } = sessionUser;

  const normalizedId = String(_id || id || sub || '');
  const normalizedRole = rawRole || null;
  const teacherFlag = normalizedRole === 'teacher' || Boolean(isTeacher);
  const displayName = name || nome || null;
  const normalizedPhoto = rawPhotoUrl || photo || null;

  return res.json({
    success: true,
    id: normalizedId,
    _id: normalizedId,
    role: normalizedRole,
    isTeacher: teacherFlag,
    email: email || null,
    name: displayName,
    photoUrl: normalizedPhoto,
    user: {
      id: normalizedId,
      _id: normalizedId,
      role: normalizedRole,
      email: email || null,
      name: displayName,
      isTeacher: teacherFlag,
      photoUrl: normalizedPhoto,
    },
  });
});

/**
 * POST /api/logout
 * Limpa cookies de autenticação usando os mesmos atributos (Domain, Secure, SameSite) definidos no app.js.
 */
router.post('/logout', authOptional, (req, res) => {
  res.clearCookie('auth_token');
  res.clearCookie('token');
  res.clearCookie('access_token');
  return res.json({ success: true });
});

module.exports = router;
