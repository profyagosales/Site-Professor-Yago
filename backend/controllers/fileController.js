const jwt = require('jsonwebtoken');
const { createReadStream, statSync } = require('fs');
const path = require('path');
const Essay = require('../models/Essay');

function getFilePathForEssay(essay) {
  // ajuste conforme seu storage (local/cloud). Exemplo local:
  return path.join(process.cwd(), 'uploads', essay.fileNameOnDisk);
}

function authorizeFile(req) {
  const qToken = req.query?.t;
  const hToken = (req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const token = qToken || hToken || '';
  if (!token) return false;
  try {
    const payload = jwt.verify(token, process.env.FILE_TOKEN_SECRET);
    // payload: { essayId, scope:'file:read' }
    if (payload?.scope !== 'file:read') return false;
    // opcional: garantir que bate com req.params.id
    if (payload.essayId && payload.essayId !== req.params.id) return false;
    return true;
  } catch { return false; }
}

exports.issueShortToken = (req, res) => {
  const token = jwt.sign(
    { essayId: req.params.id, scope: 'file:read' },
    process.env.FILE_TOKEN_SECRET,
    { expiresIn: '5m' }
  );
  res.json({ token });
};

exports.headFile = async (req, res) => {
  if (!authorizeFile(req)) return res.status(401).end();
  const essay = await Essay.findById(req.params.id);
  if (!essay) return res.status(404).end();
  const filePath = getFilePathForEssay(essay);
  const stats = statSync(filePath);
  res.set({
    'Accept-Ranges': 'bytes',
    'Content-Type': 'application/pdf',
    'Content-Length': stats.size
  });
  return res.status(200).end();
};

function authorizeByHeaderOrQuery(req) {
  const q = req.query.t;
  const hdr = req.headers.authorization;
  const raw = hdr?.startsWith('Bearer ') ? hdr.slice(7) : q;
  if (!raw) return null;
  try {
    const payload = jwt.verify(raw, fileTokenSecret);
    return payload?.essayId || null;
  } catch {
    return null;
  }
}

exports.streamFile = async (req, res) => {
  if (!authorizeFile(req)) return res.status(401).end();
  const essay = await Essay.findById(req.params.id);
  if (!essay) return res.status(404).end();
  const filePath = getFilePathForEssay(essay);
  const stats = statSync(filePath);
  const range = req.headers.range;

  res.set('Accept-Ranges', 'bytes');
  res.set('Content-Type', 'application/pdf');

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stats.size - 1;
    const chunkSize = (end - start) + 1;
    res.status(206);
    res.set({
      'Content-Range': `bytes ${start}-${end}/${stats.size}`,
      'Content-Length': chunkSize
    });
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.set('Content-Length', stats.size);
    createReadStream(filePath).pipe(res);
  }
};
