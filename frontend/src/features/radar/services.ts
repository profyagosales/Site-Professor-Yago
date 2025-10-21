import api from '@/services/api';
import type {
  RankingsFilters,
  RankingsResponse,
} from '@/types/analytics';
import { buildRankingsURL, type Entity, type Metric, type Term } from '@/api/rankings';
import {
  createFiltersKey as createAnalyticsFiltersKey,
  normalizeClassId as normalizeAnalyticsClassId,
} from '@/services/analytics';
import { metricMap, parseTerm, type RadarEntityLabel, type RadarMetricLabel, entityMap } from './maps';
import { resolveEntityLabel } from "@/shared/analytics/entities";

type FetchRankingsArgs = {
  tabLabel: RadarEntityLabel;
  metricLabel: RadarMetricLabel;
  termChip: string;
  classId?: string;
  signal?: AbortSignal;
  limit?: number;
};

function isProduction(): boolean {
  if (typeof process !== 'undefined' && typeof process.env?.NODE_ENV === 'string') {
    return process.env.NODE_ENV === 'production';
  }
  if (typeof import.meta !== 'undefined' && typeof (import.meta as any)?.env?.MODE === 'string') {
    return (import.meta as any).env.MODE === 'production';
  }
  return false;
}

export async function fetchRankings({
  tabLabel,
  metricLabel,
  termChip,
  classId,
  signal,
  limit = 10,
}: FetchRankingsArgs): Promise<RankingsResponse> {
  let entity: Entity | undefined = entityMap[tabLabel];
  let metric: Metric | undefined = metricMap[metricLabel];

  if (!entity) {
    if (typeof console !== 'undefined' && console.warn) console.warn('[Radar] Unmapped entity label:', tabLabel);
    entity = 'student';
  }
  if (!metric) {
    if (typeof console !== 'undefined' && console.warn) console.warn('[Radar] Unmapped metric label:', metricLabel);
    metric = 'term_avg';
  }
  const term: Term = parseTerm(termChip);

  const url = buildRankingsURL(entity as Entity, metric as Metric, term, {
    classId: normalizeAnalyticsClassId(classId),
    limit,
  });

  if (!isProduction()) {
    // eslint-disable-next-line no-console
    console.log('[Radar] GET', url);
  }

  const response = await api.get<RankingsResponse>(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  return response.data;
}

export function createFiltersKey(filters: RankingsFilters, limit = 10): string {
  return createAnalyticsFiltersKey(filters, limit);
}
