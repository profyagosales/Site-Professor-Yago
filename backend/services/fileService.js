const Essay = require('../models/Essay');
const http = require('http');
const https = require('https');

async function headRequest(url) {
  const h = url.startsWith('https') ? https : http;
  return new Promise((resolve) => {
    const req = h.request(url, { method: 'HEAD' }, (res) => {
      const headers = res.headers || {};
      res.resume();
      resolve(headers);
    });
    req.on('error', () => resolve({}));
    req.end();
  });
}

exports.getEssayFileStream = async (essayId, opts = {}) => {
  const essay = await Essay.findById(essayId).lean();
  if (!essay || !essay.originalUrl) {
    const e = new Error('file not found');
    e.status = 404;
    throw e;
  }
  const url = essay.originalUrl;
  const headers = await headRequest(url);
  const length = headers['content-length'] ? Number(headers['content-length']) : undefined;
  const mime = headers['content-type'] || essay.originalMimeType || 'application/pdf';
  if (opts.headOnly) {
    return { length, mime };
  }
  const h = url.startsWith('https') ? https : http;
  function stream(range) {
    const hdrs = {};
    if (range) hdrs.Range = `bytes=${range.start}-${range.end}`;
    return new Promise((resolve, reject) => {
      const req = h.get(url, { headers: hdrs }, (res) => resolve(res));
      req.on('error', reject);
    });
  }
  return { stream, length, mime };
};
