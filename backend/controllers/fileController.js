const jwt = require('jsonwebtoken');
const { FILE_TOKEN_TTL_SECONDS } = require('../config');
const Essay = require('../models/Essay');
const https = require('https');
const http = require('http');
const path = require('path');

const { assertUserCanAccessEssay } = require('../utils/assertUserCanAccessEssay');
const { canUserAccessEssay } = require('../services/acl');

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

exports.issueFileToken = async function issueFileToken(req, res) {
  const essay = await Essay.findById(req.params.id).lean();
  if (!essay) throw Object.assign(new Error('not found'), { status: 404 });
  await assertUserCanAccessEssay(req.user, essay);
  const token = issueShortFileToken({
    sub: String(req.user._id || req.user.id),
    essayId: String(essay._id),
  });
  res.json({ token });
};

async function authorizeFileAccess(req, res, next) {
  try {
    const dbg = process.env.DEBUG_FILE_TOKEN === '1';

    if (req.fileTokenPayload) {
      if (dbg) console.log('[file-token] payload', req.fileTokenPayload);
      const { essayId } = req.fileTokenPayload;
      if (essayId && String(essayId) === String(req.params.id)) {
        if (dbg) console.log('[file-token] ok → bypass cookie/session');
        return next();
      }
      if (dbg) console.warn('[file-token] mismatch id', { tokenEssayId: essayId, paramId: req.params.id });
      return res.status(401).json({ success: false, message: 'Token de arquivo inválido para este recurso.' });
    }

    if (req.fileToken) {
      if (dbg) console.warn('[file-token] token presente sem payload decodificada');
      return res.status(401).json({ success: false, message: 'Token de arquivo inválido.' });
    }

    if (req.user && req.user._id) {
      if (dbg) console.log('[file-token] fallback via sessão', { userId: req.user._id, essayId: req.params.id });
      const allowed = await canUserAccessEssay(req.user, req.params.id);
      if (allowed) return next();
      if (dbg) console.warn('[file-token] fallback negado', { userId: req.user._id, essayId: req.params.id });
      return res.status(403).json({ success: false, message: 'Sem permissão.' });
    }

    if (dbg) console.warn('[file-token] nenhuma credencial fornecida');
    return res.status(401).json({ success: false, message: 'Não autorizado.' });
  } catch (err) {
    if (process.env.DEBUG_FILE_TOKEN === '1') console.error('[file-token] erro authorize', err);
    return res.status(401).json({ success: false, message: 'Não autorizado.' });
  }
}
module.exports.authorizeFileAccess = authorizeFileAccess;

function issueShortFileToken({ sub, essayId }) {
  const ttl = Number(process.env.FILE_TOKEN_TTL_SECONDS || 300);
  const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('FILE_TOKEN_SECRET or JWT_SECRET must be configured');
  return jwt.sign({ sub, essayId }, secret, { expiresIn: ttl });
}
module.exports.issueShortFileToken = issueShortFileToken;

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

    const token = issueShortFileToken({
      sub: String(req.user._id || req.user.id),
      essayId: String(id),
    });
    const base = process.env.APP_DOMAIN_API || process.env.API_BASE_URL || '';
    const urlBase = base || '';
    const url = `${urlBase}/api/essays/${id}/file?file-token=${encodeURIComponent(token)}`;
    res.json({ url, ttl: FILE_TOKEN_TTL_SECONDS || 300 });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('getSignedFileUrl error', e);
    res.status(status).json({ error: e.message || 'Falha ao assinar URL' });
  }
};
