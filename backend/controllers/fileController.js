const jwt = require('jsonwebtoken');
const { fileTokenSecret, fileTokenTtl } = require('../config');
const { getEssayFileStream } = require('../services/fileService');

exports.issueFileToken = async (req, res) => {
  const { id } = req.params;
  const token = jwt.sign(
    { essayId: id, scope: 'file:read' },
    fileTokenSecret,
    { expiresIn: fileTokenTtl }
  );
  res.json({ token, expiresIn: fileTokenTtl });
};

// Alias para compatibilidade
exports.issueToken = exports.issueFileToken;

function extractToken(req) {
  const h = req.headers.authorization;
  if (h && h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim();
  if (req.method === 'GET' && typeof req.query.t === 'string' && req.query.t.length < 2048) {
    return req.query.t;
  }
  return null;
}

function assertToken(token) {
  if (!token) {
    const e = new Error('Missing token');
    e.status = 401;
    throw e;
  }
  return jwt.verify(token, fileTokenSecret);
}

exports.headFile = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const payload = assertToken(token);
    if (payload.essayId !== req.params.id) {
      const e = new Error('Token/essay mismatch');
      e.status = 403;
      throw e;
    }

    const { length, mime } = await getEssayFileStream(req.params.id, { headOnly: true });
    res.setHeader('Accept-Ranges', 'bytes');
    if (length != null) res.setHeader('Content-Length', length);
    res.setHeader('Content-Type', mime || 'application/pdf');
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    return res.status(200).end();
  } catch (err) {
    next(err);
  }
};

exports.getFile = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const payload = assertToken(token);
    if (payload.essayId !== req.params.id) {
      const e = new Error('Token/essay mismatch');
      e.status = 403;
      throw e;
    }

    const { stream, length, mime } = await getEssayFileStream(req.params.id);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mime || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="essay-${req.params.id}.pdf"`);

    const range = req.headers.range;
    if (length != null && range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : (length - 1);
        const chunkSize = (end - start) + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${length}`);
        res.setHeader('Content-Length', chunkSize);
        const up = await stream({ start, end });
        return up.pipe(res);
      }
    }

    if (length != null) res.setHeader('Content-Length', length);
    const up = await stream();
    return up.pipe(res);
  } catch (err) {
    next(err);
  }
};

// Método unificado para HEAD e GET
exports.streamFile = async (req, res, next) => {
  if (req.method === 'HEAD') {
    return exports.headFile(req, res, next);
  } else {
    return exports.getFile(req, res, next);
  }
};
