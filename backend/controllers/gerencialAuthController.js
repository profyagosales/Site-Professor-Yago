const jwt = require('jsonwebtoken');
const { AUTH_COOKIE, authCookieOptions } = require('../utils/cookies');

function resolveDoorPassword() {
  return process.env.GERENCIAL_DOOR_PASSWORD || 'TR24339es';
}

exports.login = (req, res) => {
  try {
    const { password } = req.body || {};
    const provided = typeof password === 'string' ? password : '';
    const expected = resolveDoorPassword();

    if (!provided) {
      return res.status(400).json({ success: false, message: 'Informe a senha gerencial.' });
    }

    if (provided !== expected) {
      return res.status(401).json({ success: false, message: 'Senha inválida.' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[gerencialAuth] JWT_SECRET ausente.');
      return res.status(500).json({ success: false, message: 'Configuração ausente no servidor.' });
    }

    const expiresInSeconds = Number(process.env.GERENCIAL_JWT_TTL_SECONDS || 45 * 60);
    const token = jwt.sign(
      {
        role: 'gerencial',
        scope: 'gerencial/admin',
      },
      secret,
      {
        subject: 'gerencial',
        expiresIn: expiresInSeconds,
      }
    );

    res.cookie(AUTH_COOKIE, token, {
      ...authCookieOptions(),
      maxAge: expiresInSeconds * 1000,
    });

    return res.json({
      success: true,
      message: 'ok',
      role: 'gerencial',
      isTeacher: false,
      scope: 'gerencial/admin',
      token,
      expiresIn: expiresInSeconds,
    });
  } catch (err) {
    console.error('[gerencialAuth] Falha inesperada no login gerencial', err);
    return res.status(500).json({ success: false, message: 'Erro ao efetuar login gerencial.' });
  }
};
