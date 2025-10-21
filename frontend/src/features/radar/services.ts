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
  const normalizedTabLabel = (tabLabel ?? '').trim();
  const normalizedMetricLabel = (metricLabel ?? '').trim();

  // Resolve labels defensively to avoid undefined params in the request
  let entity: Entity | undefined = entityMap[normalizedTabLabel as keyof typeof entityMap];
  let metric: Metric | undefined = metricMap[normalizedMetricLabel as keyof typeof metricMap];

  if (!entity) {
    const directEntity = (['student', 'class', 'activity'] as const).find((key) => key === normalizedTabLabel);
    if (directEntity) {
      entity = directEntity;
    } else {
      // Fallback to a safe default
      entity = 'student';
    }
  }

  if (!metric) {
    const directMetric = (
      ['term_avg', 'activity_peak', 'year_avg', 'term_delta'] as const
    ).find((key) => key === normalizedMetricLabel);
    if (directMetric) {
      metric = directMetric;
    } else {
      // Fallback to a safe default
      metric = 'term_avg';
    }
  }
  const term: Term = parseTerm(termChip);

  // Final safety net to guarantee defined values
  const safeEntity: Entity = (entity ?? 'student');
  const safeMetric: Metric = (metric ?? 'term_avg');

  const url = buildRankingsURL(safeEntity, safeMetric, term, {
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
