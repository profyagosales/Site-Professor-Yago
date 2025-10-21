import api from '@/services/api';
import { buildRankingsURL, type Entity, type Metric, type Term } from '@/api/rankings';
import type {
  RankingEntity,
  RankingMetric,
  RankingTerm,
  RankingsFilters,
  RankingsResponse,
} from '@/types/analytics';

export interface FetchRankingsParams {
  entity: RankingEntity;
  metric: RankingMetric;
  term: number | string;
  classId?: string | null;
  limit?: number;
  signal?: AbortSignal;
}

function coerceTerm(term: number | string): RankingTerm {
  const numeric =
    typeof term === 'string'
      ? Number.parseInt(term.replace(/\D+/g, ''), 10)
      : Number(term);

  if (numeric === 1 || numeric === 2 || numeric === 3 || numeric === 4) {
    return numeric as RankingTerm;
  }

  if (!Number.isFinite(numeric)) {
    return 1;
  }

  const bounded = Math.min(Math.max(Math.round(numeric), 1), 4);
  if (bounded === 1 || bounded === 2 || bounded === 3 || bounded === 4) {
    return bounded as RankingTerm;
  }

  return 1;
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeClassId(classId?: string | null): string | undefined {
  if (!classId) return undefined;
  const trimmed = classId.trim();
  if (!trimmed) return undefined;

  const normalized = stripDiacritics(trimmed).toLowerCase();
  if (normalized === 'todas') return undefined;
  if (normalized === 'todas as turmas') return undefined;
  if (normalized === 'all') return undefined;
  if (normalized === 'all classes') return undefined;

  return trimmed;
}

export async function fetchRankings({
  entity,
  metric,
  term,
  classId,
  limit = 10,
  signal,
}: FetchRankingsParams): Promise<RankingsResponse> {
  const rankingTerm = coerceTerm(term) as Term;
  const url = buildRankingsURL(entity as Entity, metric as Metric, rankingTerm, {
    classId: normalizeClassId(classId),
    limit,
  });

  const response = await api.get<RankingsResponse>(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  return response.data;
}

export function createFiltersKey(filters: RankingsFilters, limit = 10): string {
  const { entity, metric, term, classId } = filters;
  const normalizedClassId = normalizeClassId(classId);
  return `${entity}|${metric}|${term}|${normalizedClassId ?? ''}|${limit}`;
}
