#!/usr/bin/env node

/**
 * Smoke test for cookie-based auth flows.
 *
 * Required env vars:
 *   - SMOKE_BASE_URL (ex.: https://api.professoryagosales.com.br/api)
 *   - SMOKE_STUDENT_EMAIL
 *   - SMOKE_STUDENT_PASSWORD
 *
 * Optional:
 *   - SMOKE_TIMEOUT_MS (default 10000)
 */

const {
  SMOKE_BASE_URL,
  SMOKE_STUDENT_EMAIL,
  SMOKE_STUDENT_PASSWORD,
  SMOKE_TIMEOUT_MS,
} = process.env;

const baseUrl = (SMOKE_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:5050/api').trim();
const email = SMOKE_STUDENT_EMAIL;
const password = SMOKE_STUDENT_PASSWORD;
const timeoutMs = Number(SMOKE_TIMEOUT_MS || 10000);

if (!email || !password) {
  console.error('[smoke-auth] Defina SMOKE_STUDENT_EMAIL e SMOKE_STUDENT_PASSWORD antes de executar.');
  process.exit(1);
}

if (typeof fetch !== 'function') {
  console.error('[smoke-auth] Este script requer Node.js 18 ou superior (fetch disponível globalmente).');
  process.exit(1);
}

const cookieJar = new Map();

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = baseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function parseCookies(headers) {
  if (typeof headers?.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const raw = headers?.get('set-cookie');
  if (!raw) return [];
  return raw.split(/,(?=[^;]+=[^;]+;)/g);
}

function storeCookies(headers) {
  const cookies = parseCookies(headers);
  cookies.forEach((entry) => {
    const [pair] = entry.split(';');
    const [name, value] = pair.split('=');
    if (!name) return;
    cookieJar.set(name.trim(), value ?? '');
  });
}

function cookieHeader() {
  if (!cookieJar.size) return undefined;
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init = {
      method,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
      signal: controller.signal,
    };

    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!headers['Content-Type']) {
        init.headers['Content-Type'] = 'application/json';
      }
    }

    const cookie = cookieHeader();
    if (cookie) {
      init.headers.Cookie = cookie;
    }

    const response = await fetch(buildUrl(path), init);
    storeCookies(response.headers);

    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    return { status: response.status, ok: response.ok, data };
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log('[smoke-auth] Base URL:', baseUrl);

  console.log('[smoke-auth] 1. Login do aluno…');
  const login = await request('/auth/login-student', {
    method: 'POST',
    body: { email, password },
  });
  assert(login.status === 200, `Login do aluno falhou (status ${login.status})`);
  assert(cookieJar.has('auth_token'), 'Cookie auth_token não encontrado após login.');

  console.log('[smoke-auth] 2. /students/me com cookie…');
  const studentMe = await request('/students/me');
  assert(studentMe.status === 200, `/students/me retornou status ${studentMe.status}`);
  assert(studentMe.data?.role === 'student', 'Resposta de /students/me não indica role student.');

  console.log('[smoke-auth] 3. /auth/me confirmando sessão…');
  const me = await request('/auth/me');
  assert(me.status === 200, `/auth/me retornou status ${me.status}`);
  assert(me.data?.isTeacher === false, 'Esperava isTeacher false para aluno.');

  console.log('[smoke-auth] 4. Logout e validação…');
  const logout = await request('/auth/logout', { method: 'POST' });
  assert(logout.status === 204, `Logout retornou status ${logout.status}`);

  const afterLogout = await request('/auth/me');
  assert(afterLogout.status === 401, `Esperava 401 após logout, recebeu ${afterLogout.status}`);

  console.log('[smoke-auth] Fluxo de autenticação validado com sucesso.');
}

main().catch((err) => {
  console.error('[smoke-auth] Falha:', err?.message || err);
  process.exit(1);
});
