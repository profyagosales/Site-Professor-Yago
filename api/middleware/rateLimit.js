// Rate limiting simples em memória (por IP)
// Para produção ideal usar Redis ou outro store distribuído.
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
const maxPerWindow = parseInt(process.env.RATE_LIMIT_MAX || '120');
const buckets = new Map(); // ip -> { count, reset }

module.exports = function rateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  let entry = buckets.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + windowMs };
    buckets.set(ip, entry);
  }
  entry.count += 1;
  if (entry.count > maxPerWindow) {
    const retryAfter = Math.ceil((entry.reset - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ message: 'Muitas requisições, tente novamente mais tarde.' });
  }
  next();
};
