import { api } from './api';

export type Term = 1 | 2 | 3 | 4;

export type TermAverage = {
  term: Term;
  avg: number;
  count: number;
};

export type TeacherTermAverages = {
  items: TermAverage[];
  students: number;
};

function parseTerm(value: unknown): Term | null {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 4) {
    return numeric as Term;
  }
  return null;
}

function parseAverage(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function parseCount(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.round(numeric);
}

function normalizeItems(source: unknown): TermAverage[] {
  if (!Array.isArray(source)) {
    return [];
  }

  const mapped = source
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const raw = entry as Record<string, unknown>;
      const term =
        parseTerm(raw.term) ??
        parseTerm(raw.bimester) ??
        parseTerm(raw.bim) ??
        parseTerm(raw.termNumber);

      if (!term) {
        return null;
      }

      const avg = parseAverage(raw.avg ?? raw.media ?? raw.average);
      const count = parseCount(raw.count ?? raw.students ?? raw.total ?? raw.quantity);

      return {
        term,
        avg,
        count,
      } satisfies TermAverage;
    })
    .filter(Boolean) as TermAverage[];

  return mapped.sort((a, b) => a.term - b.term);
}

export async function getTeacherTermAverages({
  year,
  terms,
}: {
  year?: number;
  terms?: Term[];
} = {}): Promise<TeacherTermAverages> {
  const params: Record<string, string> = {};
  if (typeof year === 'number' && Number.isFinite(year)) {
    params.year = String(year);
  }
  if (Array.isArray(terms) && terms.length) {
    const distinct = Array.from(new Set(terms.filter((term) => typeof term === 'number')));
    if (distinct.length) {
      params.terms = distinct.join(',');
    }
  }

  const response = await api.get('/professor/grades/averages', {
    params,
    meta: { noCache: true },
  });

  const payload = response?.data ?? {};

  const itemsSource = Array.isArray((payload as any).items)
    ? (payload as any).items
    : Array.isArray(payload)
      ? payload
      : Array.isArray((payload as any)?.data?.items)
        ? (payload as any).data.items
        : Array.isArray((payload as any)?.data)
          ? (payload as any).data
          : [];

  const items = normalizeItems(itemsSource);

  const studentsCandidates = [
    (payload as any)?.students,
    (payload as any)?.data?.students,
    (payload as any)?.meta?.students,
  ];

  const students = studentsCandidates
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null))
    .find((value) => value !== null) ?? 0;

  return {
    items,
    students,
  };
}

export default {
  getTeacherTermAverages,
};
