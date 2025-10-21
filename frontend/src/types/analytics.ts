export type RankingEntity = 'student' | 'class' | 'activity';

export type RankingMetric = 'term_avg' | 'activity_peak' | 'year_avg' | 'term_delta';

export type RankingTerm = 1 | 2 | 3 | 4;

export interface RankingContext {
  entity: RankingEntity;
  metric: RankingMetric;
  term: RankingTerm;
  class_id?: string | null;
  base_students?: number | null;
  base_classes?: number | null;
  base_activities?: number | null;
}

export interface RankingItem {
  rank: number;
  id: string;
  name: string;
  avatar_url?: string | null;
  class_name?: string | null;
  score: number;
  delta?: number | null;
  sparkline?: number[];
}

export interface RankingsResponse {
  context: RankingContext;
  items: RankingItem[];
}

export interface RankingsFilters {
  term: RankingTerm;
  entity: RankingEntity;
  metric: RankingMetric;
  classId?: string | null;
}
