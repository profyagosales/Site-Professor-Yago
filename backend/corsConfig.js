const DEFAULT_ORIGINS = [
  'https://professoryagosales.com.br',
  'https://site-professor-yago-frontend.vercel.app',
];

function resolveOrigins() {
  const envOrigins = [];
  const raw = process.env.APP_DOMAIN || process.env.CORS_ALLOWED_ORIGINS;
  if (typeof raw === 'string' && raw.trim()) {
    raw.split(',').forEach((item) => {
      const trimmed = item.trim();
      if (trimmed) {
        envOrigins.push(trimmed);
      }
    });
  }

  const all = [...DEFAULT_ORIGINS, ...envOrigins];
  return Array.from(new Set(all));
}

const allowedOrigins = resolveOrigins();

const sharedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma'];

function originMatcher(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error(`Origin ${origin} not allowed by CORS`));
}

const corsBase = {
  origin: originMatcher,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: sharedHeaders,
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
};

const corsOptions = { ...corsBase };
const preflightOptions = { ...corsBase };

module.exports = { corsOptions, preflightOptions, allowedOrigins };
