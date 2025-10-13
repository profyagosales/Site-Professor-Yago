const ALLOWED = [
  'https://professoryagosales.com.br',
  'https://www.professoryagosales.com.br',
  process.env.FRONTEND_ORIGIN
].filter(Boolean);

// subdomínios (api.<domínio>) sempre permitidos
function isAllowedOrigin(origin) {
  if (!origin) return true; // navegações diretas
  try {
    const u = new URL(origin);
    const host = u.hostname;
    if (host.endsWith('.professoryagosales.com.br')) return true;
  } catch {}
  return ALLOWED.includes(origin);
}

const corsOptions = {
  origin(origin, cb) { cb(null, isAllowedOrigin(origin)); },
  credentials: true,
  methods: ['GET','HEAD','OPTIONS','POST','PUT','PATCH','DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-File-Token',
    'Cache-Control', // alguns browsers validam case-insensitive, outros são chatos
    'cache-control'
  ],
  exposedHeaders: [
    'Accept-Ranges',
    'Content-Type',
    'Content-Length',
    'Content-Disposition',
    'ETag',
    'Cache-Control'
  ],
  maxAge: 600
};

module.exports = { corsOptions };
