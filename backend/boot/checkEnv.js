const REQUIRED_ENV_VARS = [
  {
    key: 'MONGO_URI',
    message: 'MONGO_URI ausente: configure a string de conexão do MongoDB Atlas.',
  },
  {
    key: 'JWT_SECRET',
    message: 'JWT_SECRET ausente: configure um segredo para assinar tokens JWT.',
  },
  {
    key: 'FILE_TOKEN_SECRET',
    message: 'FILE_TOKEN_SECRET ausente: defina um segredo dedicado para tokens de arquivo.',
  },
  {
    key: 'COOKIE_DOMAIN',
    message: 'COOKIE_DOMAIN ausente: defina .professoryagosales.com.br para emissão de cookies.',
  },
  {
    key: 'APP_DOMAIN',
    message: 'APP_DOMAIN ausente: informe lista CSV de origens permitidas.',
  },
  {
    key: 'USE_COOKIE_AUTH',
    message: 'USE_COOKIE_AUTH ausente: defina "true" para habilitar autenticação via cookie.',
  },
  {
    key: 'GERENCIAL_DOOR_PASSWORD',
    message: 'GERENCIAL_DOOR_PASSWORD ausente: defina a senha utilizada no login gerencial.',
  },
];

function warn(message) {
  console.warn(`[env] WARN ${message}`);
}

function validateCookieDomain(value) {
  const trimmed = value.trim();
  if (trimmed !== '.professoryagosales.com.br') {
    warn(`COOKIE_DOMAIN diferente do esperado (.professoryagosales.com.br): recebido "${trimmed}".`);
  }
}

function validateAppDomain(value) {
  const entries = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (!entries.length) {
    warn('APP_DOMAIN inválido: forneça ao menos um domínio.');
  }
  if (entries.some((entry) => entry.includes('*'))) {
    warn('APP_DOMAIN contém curingas (*). Utilize domínios explícitos em vez de wildcards.');
  }
}

function validateUseCookieAuth(value) {
  if (value.toLowerCase() !== 'true') {
    warn(`USE_COOKIE_AUTH deve ser "true" para os logins com cookie. Valor atual: "${value}".`);
  }
}

function validateApiPrefix(value) {
  if (!value.startsWith('/')) {
    warn(`API_PREFIX deve começar com "/". Valor atual: "${value}".`);
  }
}

function validateEnv() {
  const present = new Set();

  REQUIRED_ENV_VARS.forEach(({ key, message }) => {
    if (process.env[key] && process.env[key].toString().trim()) {
      present.add(key);
    } else {
      warn(message);
    }
  });

  if (process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN.trim()) {
    validateCookieDomain(process.env.COOKIE_DOMAIN);
  }
  if (process.env.APP_DOMAIN && process.env.APP_DOMAIN.trim()) {
    validateAppDomain(process.env.APP_DOMAIN);
  }
  if (process.env.USE_COOKIE_AUTH && process.env.USE_COOKIE_AUTH.trim()) {
    validateUseCookieAuth(process.env.USE_COOKIE_AUTH);
  }
  if (process.env.API_PREFIX && process.env.API_PREFIX.trim()) {
    validateApiPrefix(process.env.API_PREFIX.trim());
  } else {
    warn('API_PREFIX ausente: padrão "/api" será utilizado.');
  }

  if (present.size === REQUIRED_ENV_VARS.length) {
    console.log('[env] Required environment variables present.');
  }
}

module.exports = { validateEnv };
