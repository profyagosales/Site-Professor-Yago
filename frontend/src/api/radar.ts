import type { RankingEntity, RankingMetric, RankingTerm } from '@/types/analytics';

const DEFAULT_API_BASE = 'https://api.professoryagosales.com.br';

function resolveApiBase(): string {
  const rawBase = (import.meta as any)?.env?.VITE_API_BASE_URL;
  const cleaned =
    typeof rawBase === 'string' && rawBase.trim()
      ? rawBase.trim().replace(/\/+$/, '')
      : '';

  const base = cleaned || DEFAULT_API_BASE;
  return base.endsWith('/api') ? base.slice(0, -4) : base;
}

const API_BASE = resolveApiBase();

function normalizeClassId(classId?: string | null): string | null {
  if (!classId) return null;
  const trimmed = classId.trim();
  if (!trimmed) return null;
  if (/^todas(\s+as\s+turmas)?$/i.test(trimmed)) return null;
  if (/^all$/i.test(trimmed)) return null;
  return trimmed;
}

export function buildRankingURL(
  entity: RankingEntity,
  metric: RankingMetric,
  term: RankingTerm,
  classId?: string | null,
): string {
  const url = new URL('/api/analytics/rankings', API_BASE);
  const params = new URLSearchParams();

  params.set('entity', entity);
  params.set('metric', metric);
  params.set('term', String(term));

  const normalizedClassId = normalizeClassId(classId);
  if (normalizedClassId) {
    params.set('class_id', normalizedClassId);
  }

  url.search = params.toString();
  return url.toString();
}

export function parseTerm(value: string | number): RankingTerm {
  if (typeof value === 'number') {
    if (value === 1 || value === 2 || value === 3 || value === 4) {
      return value;
    }
    const clamped = Math.min(Math.max(Math.round(value), 1), 4) as RankingTerm;
    return clamped;
  }

  const numeric = Number.parseInt(String(value ?? '').replace(/\D+/g, ''), 10);
  if (numeric === 1 || numeric === 2 || numeric === 3 || numeric === 4) {
    return numeric;
  }

  if (Number.isFinite(numeric)) {
    const clamped = Math.min(Math.max(Math.round(numeric), 1), 4) as RankingTerm;
    return clamped;
  }

  return 1;
}
