// Simples e à prova de 404 por params undefined
export type RankingEntity = "student" | "class" | "activity";
export type RankingMetric = "term_avg";
export type RankingTerm = 1 | 2 | 3 | 4;

export const DEFAULT_ENTITY: RankingEntity = "student";
export const DEFAULT_METRIC: RankingMetric = "term_avg";
export const DEFAULT_TERM: RankingTerm = 1;

export const ENTITY_TABS: { key: RankingEntity; label: string }[] = [
  { key: "student", label: "Alunos" },
  { key: "class",   label: "Turmas" },
  { key: "activity",label: "Atividades" },
];

export const METRIC_OPTIONS: { key: RankingMetric; label: string }[] = [
  { key: "term_avg", label: "Maior média no bimestre" },
];

export const TERM_OPTIONS: RankingTerm[] = [1, 2, 3, 4];

