import { api } from '@/services/api';

export type Bimestre = 1 | 2 | 3 | 4;

export type GradeSchemeItem = {
  id: string;
  name: string;
  label: string;
  points: number;
  type: string;
  color: string;
  order: number;
};

export type GradeSchemeBimester = {
  id?: string;
  classId: string;
  year: number;
  bimester: Bimestre;
  items: GradeSchemeItem[];
  totalPoints: number;
  showToStudents: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type GradeScheme = {
  classId: string;
  year: number;
  byBimester: Record<Bimestre, GradeSchemeBimester>;
};

const BIMESTERS: Bimestre[] = [1, 2, 3, 4];

export const GRADE_SCHEME_DEFAULT_STORAGE_KEY = 'gradeSplit:defaultTerm';

type ApiListResponse = {
  success?: boolean;
  data?: unknown;
};

type ApiError = {
  response?: {
    status?: number;
    data?: { message?: string } | undefined;
  };
  message?: string;
  code?: string;
};

const DEFAULT_COLOR = '#EB7A28';

export function DEFAULT_SCHEME(classId: string, year: number): GradeScheme {
  return {
    classId,
    year,
    byBimester: BIMESTERS.reduce(
      (acc, bimester) => {
        acc[bimester] = createEmptyBimester(classId, year, bimester);
        return acc;
      },
      { 1: createEmptyBimester(classId, year, 1), 2: createEmptyBimester(classId, year, 2), 3: createEmptyBimester(classId, year, 3), 4: createEmptyBimester(classId, year, 4) }
    ),
  };
}

export async function fetchTeacherGradeSplitSettings({
  teacherId,
}: {
  teacherId: string;
}): Promise<Bimestre | null> {
  if (!teacherId) {
    throw new Error('teacherId é obrigatório.');
  }
  try {
    const response = await api.get(`/teachers/${teacherId}/grade-split/settings`, {
      meta: { noCache: true },
    });
    const payload: any = response?.data?.data ?? response?.data ?? null;
    if (!payload) {
      return null;
    }
    const candidate =
      payload?.defaultTerm ??
      payload?.defaultBimester ??
      payload?.bimestrePadrao ??
      payload?.default ??
      payload?.bimester ??
      payload?.bimestre ??
      payload?.value ??
      null;
    if (candidate === null || candidate === undefined) {
      return null;
    }
    return ensureBimester(candidate);
  } catch (err) {
    const error = err as ApiError;
    const status = error?.response?.status;
    if (status === 404) {
      return null;
    }
    throw normalizeSettingsError(err);
  }
}

export async function saveTeacherGradeSplitSettings({
  teacherId,
  defaultBimester,
}: {
  teacherId: string;
  defaultBimester: Bimestre;
}): Promise<void> {
  if (!teacherId) {
    throw new Error('teacherId é obrigatório.');
  }
  try {
    await api.put(
      `/teachers/${teacherId}/grade-split/settings`,
      {
        defaultTerm: defaultBimester,
        defaultBimester,
      },
      { meta: { noCache: true } },
    );
  } catch (err) {
    throw normalizeSettingsError(err);
  }
}

export async function fetchGradeScheme({
  classId,
  year,
}: {
  classId: string;
  year: number;
}): Promise<GradeScheme> {
  const base = DEFAULT_SCHEME(classId, year);
  try {
    const response = await api.get<ApiListResponse>('/grade-scheme', {
      params: { classId, year },
      meta: { noCache: true },
    });
    const payload = Array.isArray(response?.data?.data) ? response.data.data : [];
    if (!Array.isArray(payload)) {
      return base;
    }

    const result = { ...base };
    result.byBimester = { ...base.byBimester };

    payload.forEach((entry, index) => {
      const normalized = normalizeBimester(entry, {
        fallbackClassId: classId,
        fallbackYear: year,
        fallbackBimester: BIMESTERS[index] ?? 1,
      });
      result.byBimester[normalized.bimester] = normalized;
    });

    return result;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function saveGradeScheme(scheme: GradeScheme): Promise<GradeScheme> {
  const latest = DEFAULT_SCHEME(scheme.classId, scheme.year);
  latest.byBimester = { ...latest.byBimester };

  for (const bimester of BIMESTERS) {
    const current = scheme.byBimester[bimester] ?? createEmptyBimester(scheme.classId, scheme.year, bimester);
    const payload = serializeBimester(current, scheme.classId, scheme.year, bimester);

    try {
      const response = await api.put('/grade-scheme', payload, { meta: { noCache: true } });
      const normalized = normalizeBimester(response?.data?.data ?? response?.data, {
        fallbackClassId: scheme.classId,
        fallbackYear: scheme.year,
        fallbackBimester: bimester,
      });
      latest.byBimester[bimester] = normalized;
    } catch (err) {
      throw normalizeError(err, bimester);
    }
  }

  return latest;
}

function createEmptyBimester(classId: string, year: number, bimester: Bimestre): GradeSchemeBimester {
  return {
    classId,
    year,
    bimester,
    items: [],
    totalPoints: 0,
    showToStudents: false,
  };
}

function normalizeBimester(
  raw: any,
  {
    fallbackClassId,
    fallbackYear,
    fallbackBimester,
  }: { fallbackClassId: string; fallbackYear: number; fallbackBimester: Bimestre },
): GradeSchemeBimester {
  const bimester = ensureBimester(raw?.bimester ?? raw?.term ?? raw?.numero ?? raw?.number ?? fallbackBimester);
  const year = Number.isFinite(Number(raw?.year)) ? Number(raw.year) : fallbackYear;
  const classId = typeof raw?.classId === 'string' && raw.classId.trim() ? raw.classId.trim() : fallbackClassId;
  const itemsSource = Array.isArray(raw?.items) ? (raw.items as unknown[]) : [];
  const items: GradeSchemeItem[] = itemsSource
    .map((item, index) => normalizeItem(item, index))
    .sort((a: GradeSchemeItem, b: GradeSchemeItem) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: Number.isFinite(item.order) ? item.order : index,
    }));
  const total = calculateTotal(items);

  return {
    id: raw?.id ?? raw?._id ?? undefined,
    classId,
    year,
    bimester,
    items,
    totalPoints: Number.isFinite(Number(raw?.totalPoints)) ? Number(raw.totalPoints) : total,
    showToStudents: Boolean(raw?.showToStudents),
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

function normalizeItem(raw: any, index: number): GradeSchemeItem {
  const orderCandidate = Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index;
  const idSource =
    typeof raw?.id === 'string'
      ? raw.id
      : typeof raw?._id === 'string'
        ? raw._id
        : typeof raw?.uuid === 'string'
          ? raw.uuid
          : null;
  return {
    id: ensureId(idSource),
    name: toTrimmedString(raw?.name ?? raw?.nome ?? raw?.label ?? ''),
    label: toTrimmedString(raw?.label ?? raw?.nome ?? raw?.name ?? ''),
    points: ensurePoints(raw?.points ?? raw?.pontos ?? 0),
    type: normalizeType(raw?.type ?? raw?.tipo ?? 'PROVA'),
    color: normalizeColor(raw?.color ?? raw?.cor ?? DEFAULT_COLOR),
    order: orderCandidate,
  };
}

function serializeBimester(
  entry: GradeSchemeBimester,
  classId: string,
  year: number,
  bimester: Bimestre,
) {
  return {
    classId,
    year,
    bimester,
    items: (entry.items ?? []).map((item: GradeSchemeItem, index: number) => ({
      id: item.id,
      name: toTrimmedString(item.name) || toTrimmedString(item.label),
      label: toTrimmedString(item.label) || toTrimmedString(item.name),
      points: Number.isFinite(item.points) ? Number(item.points) : 0,
      type: normalizeType(item.type),
      color: normalizeColor(item.color),
      order: Number.isFinite(item.order) ? Number(item.order) : index,
    })),
    showToStudents: Boolean(entry.showToStudents),
  };
}

function ensureBimester(value: any): Bimestre {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 2 || numeric === 3 || numeric === 4) {
    return numeric as Bimestre;
  }
  return 1;
}

function ensurePoints(value: any): number {
  const normalized = Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(normalized) || normalized < 0) {
    return 0;
  }
  return Number(normalized.toFixed(1));
}

function calculateTotal(items: GradeSchemeItem[]): number {
  const sum = items.reduce((acc, item) => acc + (Number.isFinite(item.points) ? Number(item.points) : 0), 0);
  return Number(sum.toFixed(1));
}

function normalizeType(value: any): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return 'PROVA';
  return raw.toUpperCase();
}

function normalizeColor(value: any): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return DEFAULT_COLOR;
  return raw.startsWith('#') ? raw : `#${raw.replace(/^#/, '')}`;
}

function ensureId(candidate: string | null): string {
  if (candidate && candidate.trim()) {
    return candidate.trim();
  }
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

function toTrimmedString(value: any): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeError(err: unknown, bimester?: Bimestre) {
  const error = err as ApiError;
  const status = error?.response?.status;
  const message = error?.response?.data?.message ?? error?.message ?? '';
  const normalized = new Error(message || 'Falha na divisão de notas');
  (normalized as any).status = status;
  if (bimester) {
    (normalized as any).bimester = bimester;
  }
  if (status === 404 || /route not found/i.test(message)) {
    normalized.message = 'Divisão de notas indisponível no momento (rota da API não encontrada)';
    (normalized as any).code = 'ROUTE_NOT_FOUND';
  }
  return normalized;
}

function normalizeSettingsError(err: unknown) {
  const error = err as ApiError;
  const status = error?.response?.status;
  const message = error?.response?.data?.message ?? error?.message ?? '';
  const normalized = new Error(message || 'Não foi possível atualizar o bimestre padrão.');
  (normalized as any).status = status;
  if (error?.code) {
    (normalized as any).code = error.code;
  }
  if (status === 404 || /rota da api não encontrada/i.test(message)) {
    normalized.message = 'Rota da API não encontrada';
    (normalized as any).code = 'ROUTE_NOT_FOUND';
  }
  return normalized;
}

