import axios from "axios";
import {
  DEFAULT_ENTITY, DEFAULT_METRIC, DEFAULT_TERM,
  type RankingEntity, type RankingMetric, type RankingTerm
} from "./maps";

export type RankingItem = {
  id: string | number;
  name: string;
  value: number;      // nota/média
  avatarUrl?: string; // opcional para alunos
  classLabel?: string; // chip de turma quando entity=student
};

export type RankingFilters = {
  entity?: RankingEntity;
  metric?: RankingMetric;
  term?: RankingTerm;
  classId?: string | number | null;
  limit?: number; // default 10
};

const API = "https://api.professoryagosales.com.br/api/analytics/rankings";

export function normalizeFilters(f: RankingFilters) {
  return {
    entity: f.entity ?? DEFAULT_ENTITY,
    metric: f.metric ?? DEFAULT_METRIC,
    term:   f.term   ?? DEFAULT_TERM,
    classId: f.classId ?? null,
    limit:  f.limit ?? 10,
  };
}

export async function fetchRankings(raw: RankingFilters): Promise<RankingItem[]> {
  const f = normalizeFilters(raw);
  const params: Record<string, any> = {
    entity: f.entity,
    metric: f.metric,
    term:   f.term,
    limit:  f.limit,
  };
  if (f.classId) params.classId = f.classId;

  const res = await axios.get(API, { params });
  // Esperado do backend: [{id,name,value,avatarUrl?,classLabel?}, ...]
  return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
}

