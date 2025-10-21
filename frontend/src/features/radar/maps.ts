import type { RankingEntity, RankingMetric } from '@/types/analytics';
import { resolveEntityLabel, ENTITY_BY_LABEL as entityMap } from "@/shared/analytics/entities";

export const metricMap = {
  'Maior média no bimestre': 'term_avg',
  'Maior nota de uma atividade': 'activity_peak',
  'Maior média no ano': 'year_avg',
  'Maior crescimento no bimestre': 'term_delta',
} as const;

export type RadarEntityLabel = keyof typeof entityMap;
export type RadarMetricLabel = keyof typeof metricMap;

type EntityEntry = [RadarEntityLabel, (typeof entityMap)[RadarEntityLabel]];
type MetricEntry = [RadarMetricLabel, (typeof metricMap)[RadarMetricLabel]];

const entityEntries = Object.entries(entityMap) as EntityEntry[];
const metricEntries = Object.entries(metricMap) as MetricEntry[];

export function parseTerm(chip: string): 1 | 2 | 3 | 4 {
  const n = Number(String(chip).replace(/\D/g, ''));
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : 1;
}

export function resolveEntityLabel(entity: RankingEntity): RadarEntityLabel {
  const match = entityEntries.find(([, value]) => value === entity);
  return match ? match[0] : entityEntries[0][0];
}

export function resolveMetricLabel(metric: RankingMetric): RadarMetricLabel {
  const match = metricEntries.find(([, value]) => value === metric);
  return match ? match[0] : metricEntries[0][0];
}
