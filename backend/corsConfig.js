const allowedOrigin = 'https://professoryagosales.com.br';

const sharedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma'];

const corsOptions = {
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: sharedHeaders,
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
};

const preflightOptions = {
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: sharedHeaders,
  optionsSuccessStatus: 204,
};

module.exports = { corsOptions, preflightOptions, allowedOrigin };
