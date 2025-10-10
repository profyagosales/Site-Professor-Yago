const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { FILE_TOKEN_SECRET, FILE_TOKEN_TTL_SECONDS } = require('../config');
const Essay = require('../models/Essay');
const https = require('https');
const http = require('http');
const path = require('path');

const { assertUserCanAccessEssay } = require('../utils/assertUserCanAccessEssay');

function readRemoteHead(url) {
  return new Promise((resolve) => {
    const h = url.startsWith('https') ? https : http;
    const r = h.request(url, { method: 'HEAD' }, (up) => {
      const headers = up.headers || {};
      resolve({ headers });
      up.resume();
    });
    r.on('error', () => resolve({ headers: {} }));
    r.end();
  });
}

// --- Token curto para PDF inline (HMAC: id.exp.sig) ---
function signFileShortToken(essayId, ttlSec = FILE_TOKEN_TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + (ttlSec || 300);
  const payload = `${essayId}.${exp}`;
  const sig = crypto.createHmac('sha256', FILE_TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

exports.issueFileToken = async function issueFileToken(req, res) {
  const essay = await Essay.findById(req.params.id).lean();
  if (!essay) throw Object.assign(new Error('not found'), { status: 404 });
  await assertUserCanAccessEssay(req.user, essay);
  const token = jwt.sign(
    { sub: String(req.user._id || req.user.id), essayId: String(essay._id) },
    FILE_TOKEN_SECRET,
    { expiresIn: FILE_TOKEN_TTL_SECONDS }
  );
  res.json({ token, ttl: FILE_TOKEN_TTL_SECONDS });
};

async function authorizeFileAccess(req, res, next) {
  try {
    // já logado por cookie/sessão
    if (req.user) return next();
    // token por header ou query (middleware já normaliza)
    const auth = req.headers.authorization || '';
    const raw = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!raw) return res.status(401).json({ message: 'Unauthorized' });
    const payload = jwt.verify(raw, process.env.JWT_SECRET);
    // se o token trouxer essayId, valide contra a rota
    if (payload.essayId && payload.essayId !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.fileAccess = { fromToken: true, sub: payload.sub, essayId: payload.essayId };
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
module.exports.authorizeFileAccess = authorizeFileAccess;

exports.getFileMeta = async function getFileMeta(essayId) {
  const essay = await Essay.findById(essayId).lean();
  if (!essay || !essay.originalUrl) {
    return { length: 0, contentType: 'application/pdf', filename: 'redacao.pdf' };
  }
  const head = await readRemoteHead(essay.originalUrl);
  // Não confiar no content-type do upstream (muitos hosts retornam text/html para HEAD)
  const contentType = essay.originalMimeType || 'application/pdf';
  const length = Number(head.headers['content-length'] || 0);
  const filename = path.basename(essay.originalUrl.split('?')[0]) || 'redacao.pdf';
  return { length, contentType, filename };
};

exports.streamFile = async function streamFile(req, res, essayId) {
  const essay = await Essay.findById(essayId).lean();
  if (!essay || !essay.originalUrl) throw Object.assign(new Error('file not found'), { status: 404 });

  const fileUrl = essay.originalUrl;
  const range = req.headers.range;
  const method = (req.method || 'GET').toUpperCase();
  const headers = {};
  if (range) headers.Range = range;
  const upstreamMethod = method === 'HEAD' ? 'GET' : method;
  if (method === 'HEAD' && !headers.Range) headers.Range = 'bytes=0-0';

  const h = fileUrl.startsWith('https') ? https : http;
  const upReq = h.request(fileUrl, { method: upstreamMethod, headers }, (up) => {
    const status = up.statusCode || 200;
    if (status >= 400) {
      res.status(status).end();
      up.resume();
      return;
    }
    const ct = essay.originalMimeType || up.headers['content-type'] || 'application/pdf';
    res.set({
      'Accept-Ranges': 'bytes',
      'Content-Type': ct,
      'Content-Disposition': `inline; filename="${path.basename(fileUrl.split('?')[0])}"`,
    });
    if (up.headers['content-length']) res.set('Content-Length', up.headers['content-length']);
    if (up.headers['content-range']) res.set('Content-Range', up.headers['content-range']);
    res.status(range ? 206 : 200);
    if (method === 'HEAD') { up.resume(); res.end(); }
    else { up.pipe(res); }
  });
  upReq.on('error', () => res.status(502).end());
  upReq.end();
};

// GET /api/essays/:id/file-signed -> { url, ttl }
exports.getSignedFileUrl = async function getSignedFileUrl(req, res) {
  try {
    const { id } = req.params;
    // Requer autenticação normal do usuário para emitir URL assinada
    const essay = await Essay.findById(id).lean();
    if (!essay) throw Object.assign(new Error('not found'), { status: 404 });
    await assertUserCanAccessEssay(req.user, essay);

    const token = signFileShortToken(id, FILE_TOKEN_TTL_SECONDS || 300);
    const base = process.env.APP_DOMAIN_API || process.env.API_BASE_URL || '';
    const urlBase = base || '';
    const url = `${urlBase}/api/essays/${id}/file?s=${encodeURIComponent(token)}`;
    res.json({ url, ttl: FILE_TOKEN_TTL_SECONDS || 300 });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('getSignedFileUrl error', e);
    res.status(status).json({ error: e.message || 'Falha ao assinar URL' });
  }
};
