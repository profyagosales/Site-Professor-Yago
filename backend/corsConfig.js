const cors = require('cors');

const origins = (process.env.FRONTEND_ORIGIN || 'https://professoryagosales.com.br')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // aceita navegações sem Origin (navegador interno) e a lista de ORIGENS válidas
    if (!origin) return cb(null, true);
    const ok = origins.includes(origin);
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
  methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
  // <— Cache-Control incluso aqui
  allowedHeaders: [
    'Content-Type','Authorization','X-Requested-With',
    'Cache-Control','Pragma','X-File-Token','X-Access-Token','Accept'
  ],
  exposedHeaders: [
    'Content-Disposition','Content-Length','Content-Type',
    'ETag','Cache-Control','Accept-Ranges'
  ],
  maxAge: 86400, // pré-flight em cache por 24h
};

module.exports = { cors, corsOptions };
