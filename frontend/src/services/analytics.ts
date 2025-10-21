import { api } from '@/services/api';
import type { RankingEntity, RankingMetric, RankingsFilters, RankingsResponse } from '@/types/analytics';

export interface FetchRankingsParams {
  entity: RankingEntity;
  metric: RankingMetric;
  term: number;
  classId?: string | null;
  signal?: AbortSignal;
}

function buildQuery({ entity, metric, term, classId }: FetchRankingsParams) {
  const params: Record<string, string> = {
    entity,
    metric,
    term: String(term),
  };
  if (classId) {
    params.class_id = classId;
  }
  return params;
}

export async function fetchRankings(params: FetchRankingsParams): Promise<RankingsResponse> {
  const response = await api.get<RankingsResponse>('/analytics/rankings', {
    params: buildQuery(params),
    signal: params.signal,
  });
  return response.data;
}

export function createFiltersKey(filters: RankingsFilters): string {
  const { entity, metric, term, classId } = filters;
  return `${entity}|${metric}|${term}|${classId ?? ''}`;
}
