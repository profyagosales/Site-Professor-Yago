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

exports.streamFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    // autoriza: header OU ?t=
    const essayId = authorizeByHeaderOrQuery(req);
    if (!essayId || essayId !== id) return res.sendStatus(401);

    const { stream, length, mime } = await getEssayFileStream(id, { 
      headOnly: req.method === 'HEAD' 
    });

    const commonHeaders = {
      'Content-Type': mime || 'application/pdf',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${id}.pdf"`
    };

    if (req.method === 'HEAD') {
      res.set({ ...commonHeaders, 'Content-Length': length || 0 }).end();
      return;
    }

    const range = req.headers.range;
    if (length != null && range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : (length - 1);
        const chunkSize = (end - start) + 1;

        res.writeHead(206, {
          ...commonHeaders,
          'Content-Range': `bytes ${start}-${end}/${length}`,
          'Content-Length': chunkSize
        });

        const rangedStream = await stream({ start, end });
        return rangedStream.pipe(res);
      }
    }

    res.writeHead(200, { ...commonHeaders, 'Content-Length': length || 0 });
    const fullStream = await stream();
    return fullStream.pipe(res);
  } catch (err) {
    next(err);
  }
};
