const STATIC_ORIGINS = [
  'https://professoryagosales.com.br',
  'https://www.professoryagosales.com.br',
  'https://site-professor-yago-frontend.vercel.app',
];

const VERCEL_PREVIEW_REGEX = /^https:\/\/.*\.vercel\.app$/i;

function parseAppDomains() {
  const value = process.env.APP_DOMAIN;
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const allowedExact = new Set([...STATIC_ORIGINS, ...parseAppDomains()]);

const sharedHeaders = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Cache-Control',
  'Pragma',
  'Expires',
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedExact.has(origin)) return true;
  if (VERCEL_PREVIEW_REGEX.test(origin)) return true;
  return false;
}

function originMatcher(origin, callback) {
  if (isAllowedOrigin(origin)) {
    return callback(null, true);
  }
  const error = new Error(`Origin ${origin} not allowed by CORS`);
  error.status = 403;
  return callback(error);
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

module.exports = { corsOptions, preflightOptions, allowedOrigins: Array.from(allowedExact) };
