import { api } from '@/services/api';
import { buildRankingURL, parseTerm } from '@/api/radar';
import { normalizeClassId as normalizeClassIdentifier } from '@/utils/normalizers';
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

function ensureTerm(term: number | string): RankingTerm {
  return parseTerm(term);
}

export async function fetchRankings(params: FetchRankingsParams): Promise<RankingsResponse> {
  const term = ensureTerm(params.term);
  const normalizedClassId = normalizeClassId(params.classId);
  const url = buildRankingURL(params.entity, params.metric, term, normalizedClassId);

  const response = await api.get<RankingsResponse>(url, {
    signal: params.signal,
    headers: { Accept: 'application/json' },
  });

  return response.data;
}

export function normalizeClassId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = normalizeClassIdentifier(value);
  return normalized === '—' ? null : normalized;
}

export function createFiltersKey(filters: RankingsFilters, limit = 10): string {
  const { entity, metric, term, classId } = filters;
  const normalizedClassId = normalizeClassId(classId);
  return `${entity}|${metric}|${term}|${normalizedClassId ?? ''}|${limit}`;
}
