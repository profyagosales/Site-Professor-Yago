// Sanitização simples de strings para evitar injections triviais.
// (Para algo mais robusto considerar DOMPurify server-side ou biblioteca específica.)
const dangerousPatterns = /(<script|javascript:|onerror=|onload=)/ig;

function sanitizeValue(v) {
  if (typeof v === 'string') {
    return v.replace(dangerousPatterns, '');
  }
  if (Array.isArray(v)) return v.map(sanitizeValue);
  if (v && typeof v === 'object') return sanitizeObject(v);
  return v;
}

function sanitizeObject(obj) {
  for (const k of Object.keys(obj)) {
    obj[k] = sanitizeValue(obj[k]);
  }
  return obj;
}

module.exports = function inputSanitizer(req, res, next) {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  next();
};
