import { api } from '@/services/api';
import { buildRankingURL, parseTerm } from '@/api/radar';
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
  signal?: AbortSignal;
}

function ensureTerm(term: number | string): RankingTerm {
  return parseTerm(term);
}

export async function fetchRankings(params: FetchRankingsParams): Promise<RankingsResponse> {
  const term = ensureTerm(params.term);
  const url = buildRankingURL(params.entity, params.metric, term, params.classId);

  const response = await api.get<RankingsResponse>(url, {
    signal: params.signal,
    headers: { Accept: 'application/json' },
  });
  return response.data;
}

export function createFiltersKey(filters: RankingsFilters): string {
  const { entity, metric, term, classId } = filters;
  return `${entity}|${metric}|${term}|${classId ?? ''}`;
}
