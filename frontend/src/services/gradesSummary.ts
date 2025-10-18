import { api } from '@/services/api';

export type GradeSummaryStat = {
  bim: number;
  avg: number;
  median: number;
  n: number;
};

export type GradeSummaryResponse = {
  year: number;
  bimesters: number[];
  stats: GradeSummaryStat[];
};

function parseNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeStat(raw: any): GradeSummaryStat | null {
  if (!raw || typeof raw !== 'object') return null;
  const bim = parseNumber(raw.bim ?? raw.bimester ?? raw.term, NaN);
  if (!Number.isInteger(bim) || bim < 1 || bim > 4) return null;
  const avg = parseNumber(raw.avg ?? raw.average ?? raw.media, 0);
  const median = parseNumber(raw.median ?? raw.mediana, 0);
  const n = Math.max(parseNumber(raw.n ?? raw.count ?? raw.total, 0), 0);
  return { bim, avg, median, n };
}

export async function getGradesSummary({
  year,
  bimesters,
}: {
  year: number;
  bimesters: number[];
}): Promise<GradeSummaryResponse> {
  const params: Record<string, string> = {};
  if (Number.isFinite(year)) {
    params.year = String(year);
  }
  if (Array.isArray(bimesters) && bimesters.length) {
    const filtered = Array.from(new Set(bimesters.filter((value) => Number.isInteger(value) && value >= 1 && value <= 4)));
    if (filtered.length) {
      params.b = filtered.join(',');
    }
  }

  const response = await api.get('/grades/summary', {
    params,
    meta: { noCache: true },
  });

  const payload = response?.data ?? {};
  const statsSource = Array.isArray(payload.stats)
    ? payload.stats
    : Array.isArray(payload.data?.stats)
      ? payload.data.stats
      : [];

  const stats = statsSource
    .map((entry) => normalizeStat(entry))
    .filter(Boolean) as GradeSummaryStat[];

  const normalizedYear = Number.isFinite(payload.year) ? Number(payload.year) : year;
  const normalizedBimesters = Array.isArray(payload.bimesters)
    ? payload.bimesters
        .map((value: any) => Number(value))
        .filter((value: number) => Number.isInteger(value) && value >= 1 && value <= 4)
    : bimesters;

  return {
    year: normalizedYear,
    bimesters: normalizedBimesters,
    stats,
  };
}

export default {
  getGradesSummary,
};
