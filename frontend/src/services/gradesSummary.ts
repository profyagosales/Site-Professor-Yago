import { api } from '@/services/api';

export type GradeSummaryPoint = {
  bimester: number;
  avg: number;
  median: number;
  count: number;
};

export type GradeSummaryResponse = {
  year: number;
  bimesters: number[];
  series: GradeSummaryPoint[];
  avgByBimester: Record<number, number>;
  medianByBimester: Record<number, number>;
  count: number;
};

function parseNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseBimester(value: unknown) {
  const numeric = parseNumber(value, NaN);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 4) return NaN;
  return numeric;
}

function normalizePoint(raw: any): GradeSummaryPoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const bimester = parseBimester(raw.bimester ?? raw.bim ?? raw.term);
  if (!Number.isInteger(bimester)) return null;
  const avg = parseNumber(raw.avg ?? raw.average ?? raw.media, 0);
  const median = parseNumber(raw.median ?? raw.mediana, 0);
  const count = Math.max(parseNumber(raw.count ?? raw.n ?? raw.total, 0), 0);
  return {
    bimester,
    avg,
    median,
    count,
  };
}

function normalizeSeries(source: unknown): GradeSummaryPoint[] {
  const rawList = Array.isArray(source)
    ? source
    : Array.isArray((source as any)?.series)
      ? (source as any).series
      : [];

  return rawList
    .map((entry) => normalizePoint(entry))
    .filter(Boolean) as GradeSummaryPoint[];
}

function normalizeBimesters(source: unknown, fallback: number[]): number[] {
  if (!Array.isArray(source)) return fallback;
  const values = source
    .map((entry) => parseBimester(entry))
    .filter((value) => Number.isInteger(value)) as number[];
  return values.length ? values : fallback;
}

export async function getGradesSummary({
  year,
  bimesters,
  classId,
}: {
  year: number;
  bimesters: number[];
  classId?: string | null;
}): Promise<GradeSummaryResponse> {
  const params: Record<string, string> = {};
  if (Number.isFinite(year)) {
    params.year = String(year);
  }
  if (Array.isArray(bimesters) && bimesters.length) {
    const filtered = Array.from(
      new Set(
        bimesters
          .map((value) => parseBimester(value))
          .filter((value) => Number.isInteger(value))
      )
    );
    if (filtered.length) {
      params.bimesters = filtered.join(',');
    }
  }
  if (classId && typeof classId === 'string' && classId.trim()) {
    params.classId = classId.trim();
  }

  const response = await api.get('/grades/summary', {
    params,
    meta: { noCache: true },
  });

  const base = response?.data ?? {};
  const payload = base?.data ?? base;

  const series = normalizeSeries(payload);
  const normalizedYear = Number.isFinite(payload.year) ? Number(payload.year) : year;
  const normalizedBimesters = normalizeBimesters(payload.bimesters, bimesters);
  const avgByBimester: Record<number, number> = {};
  const medianByBimester: Record<number, number> = {};
  let totalCount = 0;

  series.forEach((point) => {
    avgByBimester[point.bimester] = point.avg;
    medianByBimester[point.bimester] = point.median;
    totalCount += point.count;
  });

  return {
    year: normalizedYear,
    bimesters: normalizedBimesters,
    series,
    avgByBimester,
    medianByBimester,
    count: totalCount,
  };
}

export default {
  getGradesSummary,
};
