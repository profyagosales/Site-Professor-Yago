const jwt = require('jsonwebtoken');
const { fileTokenSecret, fileTokenTtl } = require('../config');
const { getEssayFileStream } = require('../services/fileService');

function authorizeFile(req) {
  const qToken = req.query?.t;
  const hToken = (req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const token = qToken || hToken || '';
  if (!token) return false;
  try {
    const payload = jwt.verify(token, fileTokenSecret);
    if (payload?.scope !== 'file:read') return false;
    if (payload.essayId && payload.essayId !== req.params.id) return false;
    return true;
  } catch {
    return false;
  }
}

exports.headFile = async (req, res, next) => {
  try {
    if (!authorizeFile(req)) return res.status(401).end();
    const { length, mime } = await getEssayFileStream(req.params.id, { headOnly: true });
    res.set({
      'Accept-Ranges': 'bytes',
      'Content-Type': mime || 'application/pdf'
    });
    if (length != null) res.set('Content-Length', length);
    return res.status(200).end();
  } catch (err) {
    next(err);
  }
};

exports.streamFile = async (req, res, next) => {
  try {
    if (!authorizeFile(req)) return res.status(401).end();
    const { stream, length, mime } = await getEssayFileStream(req.params.id);
    res.set('Accept-Ranges', 'bytes');
    res.set('Content-Type', mime || 'application/pdf');
    const range = req.headers.range;
    if (range && length != null) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : length - 1;
      const chunkSize = (end - start) + 1;
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${length}`,
        'Content-Length': chunkSize
      });
      (await stream({ start, end })).pipe(res);
    } else {
      if (length != null) res.set('Content-Length', length);
      (await stream()).pipe(res);
    }
  } catch (err) {
    next(err);
  }
};

exports.issueShortToken = (req, res) => {
  const token = jwt.sign(
    { essayId: req.params.id, scope: 'file:read' },
    fileTokenSecret,
    { expiresIn: fileTokenTtl }
  );
  res.json({ token });
};
