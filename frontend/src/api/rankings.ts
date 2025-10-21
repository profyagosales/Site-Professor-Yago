const DEFAULT_API_BASE = 'https://api.professoryagosales.com.br';

function resolveEnv(key: string | undefined): string {
  return typeof key === 'string' ? key.trim() : '';
}

function resolveApiBase(): string {
  const nextEnv = resolveEnv((typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_BASE_URL : undefined) as string | undefined);
  const viteEnv = resolveEnv((typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.VITE_API_BASE_URL : undefined));

  const raw = nextEnv || viteEnv || DEFAULT_API_BASE;
  const trimmed = raw.replace(/\s+/g, '').replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_API_BASE;
  const normalized = trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
  return normalized || DEFAULT_API_BASE;
}

const API_BASE = resolveApiBase();

export type Entity = 'student' | 'class' | 'activity';
export type Metric = 'term_avg' | 'activity_peak' | 'year_avg' | 'term_delta';
export type Term = 1 | 2 | 3 | 4;

export function buildRankingsURL(
  entity: Entity,
  metric: Metric,
  term: Term,
  opts?: { classId?: string; limit?: number },
) {
  const url = new URL('/api/analytics/rankings', API_BASE);
  const qs = new URLSearchParams();

  qs.set('entity', entity);
  qs.set('metric', metric);
  qs.set('term', String(term));

  const classId = typeof opts?.classId === 'string' ? opts.classId.trim() : '';
  if (classId) {
    qs.set('class_id', classId);
  }

  const limit = Number.isFinite(opts?.limit) ? Math.max(1, Math.trunc(Number(opts?.limit))) : 10;
  qs.set('limit', String(limit));

  url.search = qs.toString();

  if (!url.pathname.endsWith('/api/analytics/rankings')) {
    throw new Error(`Rota inválida: ${url.toString()}`);
  }

  return url.toString();
}
