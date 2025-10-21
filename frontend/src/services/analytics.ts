import { api } from '@/services/api';
import type { RankingEntity, RankingMetric, RankingsFilters, RankingsResponse } from '@/types/analytics';

export interface FetchRankingsParams {
  entity: RankingEntity;
  metric: RankingMetric;
  term: number | string;
  classId?: string | null;
  signal?: AbortSignal;
}

function normalizeTerm(term: number | string): string {
  const parsed =
    typeof term === 'string'
      ? Number.parseInt(term.replace(/\D+/g, ''), 10)
      : Number(term);

  if (!Number.isFinite(parsed)) return '1';
  const rounded = Math.round(parsed);
  const bounded = Math.min(Math.max(rounded, 1), 4);
  return String(bounded);
}

function normalizeClassId(classId?: string | null): string | null {
  if (!classId) return null;
  const trimmed = classId.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === 'all') return null;
  if (lower === 'todas') return null;
  if (lower.startsWith('todas ')) return null;
  return trimmed;
}

function buildQuery({ entity, metric, term, classId }: FetchRankingsParams) {
  const params = new URLSearchParams({
    entity,
    metric,
    term: normalizeTerm(term),
  });

  const normalizedClassId = normalizeClassId(classId);
  if (normalizedClassId) {
    params.set('class_id', normalizedClassId);
  }

  return params;
}

export async function fetchRankings(params: FetchRankingsParams): Promise<RankingsResponse> {
  const response = await api.get<RankingsResponse>('/analytics/rankings', {
    params: buildQuery(params),
    signal: params.signal,
    headers: { Accept: 'application/json' },
  });
  return response.data;
}

export function createFiltersKey(filters: RankingsFilters): string {
  const { entity, metric, term, classId } = filters;
  return `${entity}|${metric}|${term}|${classId ?? ''}`;
}
