// Rate limit dedicado para endpoints de IA (por usuário professor)
// Janela pequena para evitar abuso e custo futuro.
const windowMs = 5 * 60 * 1000; // 5 minutos
const maxPerWindow = 10; // 10 requisições por janela
const buckets = new Map(); // userId -> { count, reset }

module.exports = function aiRateLimit(req, res, next) {
  const userId = req.user?._id?.toString() || 'anon';
  const now = Date.now();
  let entry = buckets.get(userId);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + windowMs };
    buckets.set(userId, entry);
  }
  entry.count += 1;
  if (entry.count > maxPerWindow) {
    const retryAfter = Math.ceil((entry.reset - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ message: 'Limite de sugestões IA excedido. Tente novamente em alguns minutos.' });
  }
  next();
};
