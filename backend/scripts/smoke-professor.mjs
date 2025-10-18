#!/usr/bin/env node

const BASE_URL = (() => {
  const raw = process.env.SMOKE_BASE_URL || process.env.API_BASE_URL || '';
  if (!raw) return 'http://localhost:3000/api';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

const teacherEmail = process.env.SMOKE_TEACHER_EMAIL;
const teacherPassword = process.env.SMOKE_TEACHER_PASSWORD;

const cookieJar = new Map();

function setCookiesFromResponse(headers) {
  if (!headers) return;
  const cookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : headers.raw?.()['set-cookie'];
  if (!Array.isArray(cookies)) return;
  cookies.forEach((entry) => {
    const [pair] = entry.split(';');
    const [name, value] = pair.split('=');
    if (name) {
      cookieJar.set(name.trim(), value?.trim() ?? '');
    }
  });
}

function buildCookieHeader() {
  if (!cookieJar.size) return '';
  return Array.from(cookieJar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has('Content-Type') && body) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  const cookieHeader = buildCookieHeader();
  if (cookieHeader) {
    finalHeaders.set('Cookie', cookieHeader);
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body,
    redirect: 'manual',
  });

  setCookiesFromResponse(response.headers);
  return response;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function ensureCredentials() {
  if (!teacherEmail || !teacherPassword) {
    throw new Error('Configure SMOKE_TEACHER_EMAIL e SMOKE_TEACHER_PASSWORD');
  }
}

function extractClassId(payload) {
  if (!payload) return null;
  const candidates = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  for (const entry of candidates) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.classId) return String(entry.classId);
    if (entry._id) return String(entry._id);
    if (entry.id) return String(entry.id);
  }
  if (Array.isArray(payload?.items)) {
    for (const entry of payload.items) {
      if (entry && typeof entry === 'object') {
        if (entry.classId) return String(entry.classId);
        if (entry._id) return String(entry._id);
        if (entry.id) return String(entry.id);
      }
    }
  }
  return null;
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

const steps = [
  {
    label: '1) Login professor',
    run: async () => {
      ensureCredentials();
      const response = await request('/auth/login-teacher', {
        method: 'POST',
        body: JSON.stringify({ email: teacherEmail, password: teacherPassword }),
      });
      if (!response.ok) {
        const payload = await readJson(response);
        throw new Error(`HTTP ${response.status} ${response.statusText} ${(payload && payload.message) || ''}`);
      }
      return true;
    },
  },
  {
    label: '2) Obter turma para testes',
    run: async (context) => {
      const response = await request('/classes');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao listar turmas`);
      }
      const payload = await readJson(response);
      const classId = extractClassId(payload);
      if (!classId) {
        throw new Error('Nenhuma turma encontrada para o professor.');
      }
      context.classId = classId;
      return true;
    },
  },
  {
    label: '3) Criar aviso',
    run: async (context) => {
      const response = await request('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          message: `Aviso smoke test ${new Date().toISOString()}`,
          target: { type: 'class', value: [context.classId] },
          includeTeachers: false,
        }),
      });
      if (response.status !== 201) {
        const payload = await readJson(response);
        throw new Error(`Falha ao criar aviso: HTTP ${response.status} ${(payload && payload.message) || ''}`);
      }
      const payload = await readJson(response);
      context.announcement = payload?.data || payload;
      return true;
    },
  },
  {
    label: '4) Criar conteúdo',
    run: async (context) => {
      const response = await request('/contents', {
        method: 'POST',
        body: JSON.stringify({
          classId: context.classId,
          title: `Conteúdo smoke ${randomSuffix()}`,
          description: 'Conteúdo criado automaticamente pelo smoke test.',
          date: new Date().toISOString(),
          bimester: 1,
          done: false,
        }),
      });
      if (response.status !== 201) {
        const payload = await readJson(response);
        throw new Error(`Falha ao criar conteúdo: HTTP ${response.status} ${(payload && payload.message) || ''}`);
      }
      const payload = await readJson(response);
      const content = payload?.data || payload;
      if (!content || !content.id) {
        throw new Error('Resposta do conteúdo sem identificador.');
      }
      context.contentId = content.id;
      return true;
    },
  },
  {
    label: '5) Consultar médias por bimestre',
    run: async () => {
      const year = new Date().getFullYear();
      const response = await request(`/grades/summary?year=${year}`);
      if (!response.ok) {
        const payload = await readJson(response);
        throw new Error(`Falha ao consultar resumo de notas: HTTP ${response.status} ${(payload && payload.message) || ''}`);
      }
      return true;
    },
  },
  {
    label: '6) Remover conteúdo criado',
    run: async (context) => {
      if (!context.contentId) {
        throw new Error('Conteúdo para exclusão não encontrado no contexto.');
      }
      const response = await request(`/contents/${context.contentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const payload = await readJson(response);
        throw new Error(`Falha ao remover conteúdo: HTTP ${response.status} ${(payload && payload.message) || ''}`);
      }
      return true;
    },
  },
];

async function main() {
  const context = {};
  let hasError = false;

  for (const step of steps) {
    try {
      await step.run(context);
      console.log(`${step.label}: OK`);
    } catch (err) {
      hasError = true;
      console.error(`${step.label}: FAIL – ${err.message}`);
      break;
    }
  }

  if (hasError) {
    process.exitCode = 1;
  } else {
    console.log('Smoke professor finalizado com sucesso.');
  }
}

main().catch((err) => {
  console.error('Smoke geral falhou:', err);
  process.exit(1);
});
