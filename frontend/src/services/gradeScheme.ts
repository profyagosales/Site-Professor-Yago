import { api } from '@/services/api';
import { Bimester, GradeItem, GradeScheme as GradeSchemeItems, GradeSchemeForProfessor } from '@/types/gradeScheme';

export type GradeSchemeItem = {
  name: string;
  label: string;
  points: number;
  type: string | null;
  color: string | null;
  order: number;
};

export type GradeScheme = {
  id: string;
  classId: string | null;
  year: number;
  bimester: number;
  items: GradeSchemeItem[];
  totalPoints: number;
  showToStudents: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

function normalizeItem(raw: any, fallbackOrder = 0): GradeSchemeItem {
  const rawName = typeof raw?.name === 'string' ? raw.name.trim() : '';
  const label = typeof raw?.label === 'string' ? raw.label.trim() : '';
  const name = rawName || label;
  const points = Number.isFinite(raw?.points) ? Number(raw.points) : Number.parseFloat(String(raw?.points ?? 0)) || 0;
  const color =
    typeof raw?.color === 'string' && raw.color.trim()
      ? raw.color.trim()
      : null;
  const type =
    typeof raw?.type === 'string' && raw.type.trim()
      ? raw.type.trim().toUpperCase()
      : null;
  const order = Number.isFinite(raw?.order) ? Number(raw.order) : fallbackOrder;
  return {
    name,
    label: label || name,
    points,
    type,
    color,
    order,
  };
}

function normalizeScheme(raw: any): GradeScheme | null {
  if (!raw || typeof raw !== 'object') return null;
  const id =
    typeof raw.id === 'string'
      ? raw.id
      : typeof raw._id === 'string'
        ? raw._id
        : null;
  if (!id) return null;
  const classId =
    typeof raw.classId === 'string'
      ? raw.classId
      : typeof raw.class === 'string'
        ? raw.class
        : raw.classId?._id
          ? String(raw.classId._id)
          : null;
  const year = Number.isFinite(raw.year) ? Number(raw.year) : Number.parseInt(String(raw.year ?? 0), 10) || new Date().getFullYear();
  const bimester = Number.isFinite(raw.bimester) ? Number(raw.bimester) : Number.parseInt(String(raw.bimester ?? 0), 10) || 1;

  const itemsSource = Array.isArray(raw.items) ? raw.items : [];
  const items = itemsSource
    .map((item, index) => normalizeItem(item, index))
    .sort((a, b) => a.order - b.order);

  const totalPoints = Number.isFinite(raw.totalPoints)
    ? Number(raw.totalPoints)
    : Number(items.reduce((sum, entry) => sum + (Number.isFinite(entry.points) ? entry.points : 0), 0).toFixed(2));

  const createdAt =
    raw.createdAt instanceof Date
      ? raw.createdAt.toISOString()
      : typeof raw.createdAt === 'string'
        ? raw.createdAt
        : null;
  const updatedAt =
    raw.updatedAt instanceof Date
      ? raw.updatedAt.toISOString()
      : typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : null;

  return {
    id,
    classId,
    year,
    bimester,
    items,
    totalPoints,
    showToStudents: Boolean(raw.showToStudents),
    createdAt,
    updatedAt,
  };
}

export async function listSchemes({ classId, year }: { classId: string; year: number }): Promise<GradeScheme[]> {
  if (!classId) return [];
  const response = await api.get('/grade-scheme', {
    params: { classId, year },
    meta: { noCache: true },
  });
  const payload = response?.data?.data ?? response?.data ?? [];
  const entries = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
  return entries.map((entry) => normalizeScheme(entry)).filter(Boolean) as GradeScheme[];
}

export async function getScheme(id: string): Promise<GradeScheme | null> {
  if (!id) return null;
  const response = await api.get(`/grade-scheme/${id}`, {
    meta: { noCache: true },
  });
  const payload = response?.data?.data ?? response?.data ?? null;
  return normalizeScheme(payload);
}

export async function upsertScheme(payload: {
  classId: string;
  year: number;
  bimester: number;
  items: GradeSchemeItem[];
  showToStudents?: boolean;
}): Promise<GradeScheme | null> {
  const response = await api.put(
    '/grade-scheme',
    payload,
    { meta: { noCache: true } },
  );
  const data = response?.data?.data ?? response?.data ?? null;
  return normalizeScheme(data);
}

export async function setVisibleScheme(payload: { classId: string; year: number; bimester: number }): Promise<GradeScheme | null> {
  const response = await api.patch(
    '/grade-scheme/show',
    payload,
    { meta: { noCache: true } },
  );
  const data = response?.data?.data ?? response?.data ?? null;
  return normalizeScheme(data);
}

const BIMESTERS: Bimester[] = [1, 2, 3, 4];
const GRADE_ITEM_TYPES: GradeItem['type'][] = ['Prova', 'Trabalho', 'Projeto', 'Teste', 'Outros'];
const DEFAULT_ITEM_COLOR = '#F28C2E';

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`;

function unwrapPayload(payload: any): any {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload;
}

function ensureBimester(value: unknown, fallback: Bimester = 1): Bimester {
  const parsed = Number(value);
  if (BIMESTERS.includes(parsed as Bimester)) {
    return parsed as Bimester;
  }
  return fallback;
}

function resolveGradeItemType(value: unknown): GradeItem['type'] {
  if (typeof value !== 'string') {
    return 'Prova';
  }
  const normalized = value.trim().toLowerCase();
  const matched = GRADE_ITEM_TYPES.find((entry) => entry.toLowerCase() === normalized);
  return matched ?? 'Prova';
}

function normalizeGradeItem(raw: any, fallbackBimester: Bimester): GradeItem {
  const idSource =
    typeof raw?.id === 'string'
      ? raw.id
      : typeof raw?._id === 'string'
        ? raw._id
        : null;
  const id = idSource && idSource.trim() ? idSource : makeId();
  const nameSource =
    typeof raw?.name === 'string'
      ? raw.name
      : typeof raw?.label === 'string'
        ? raw.label
        : '';
  const name = nameSource.trim();
  const pointsValue =
    typeof raw?.points === 'number'
      ? raw.points
      : raw?.points !== undefined
        ? Number.parseFloat(String(raw.points).replace(',', '.'))
        : 0;
  const boundedPoints = Number.isFinite(pointsValue) ? Math.min(Math.max(pointsValue, 0), 10) : 0;
  const color =
    typeof raw?.color === 'string' && raw.color.trim() ? raw.color.trim() : DEFAULT_ITEM_COLOR;
  const bimester = ensureBimester(raw?.bimester, fallbackBimester);
  const type = resolveGradeItemType(raw?.type);

  return {
    id,
    name,
    type,
    points: Number.parseFloat(boundedPoints.toFixed(2)),
    color,
    bimester,
  };
}

function normalizeItemsFromRecord(record: any): GradeSchemeItems {
  if (!record || typeof record !== 'object') {
    return [];
  }
  return BIMESTERS.flatMap((bimester) => {
    const entries = Array.isArray(record[bimester]) ? record[bimester] : [];
    return entries.map((entry: any) => normalizeGradeItem(entry, bimester));
  });
}

function normalizeSchemePayload(payload: any): GradeSchemeItems {
  const resolved = unwrapPayload(payload);
  if (!resolved) {
    return [];
  }
  if (Array.isArray(resolved)) {
    return resolved.map((entry) => normalizeGradeItem(entry, ensureBimester(entry?.bimester, 1)));
  }
  if (Array.isArray(resolved?.items)) {
    return resolved.items.map((entry: any) =>
      normalizeGradeItem(entry, ensureBimester(entry?.bimester, 1)),
    );
  }
  if (resolved?.scheme) {
    return normalizeItemsFromRecord(resolved.scheme);
  }
  return [];
}

function extractUpdatedAt(payload: any): string | null {
  const resolved = unwrapPayload(payload);
  const raw = resolved?.updatedAt ?? resolved?.lastUpdatedAt ?? resolved?.schemeUpdatedAt;
  if (typeof raw === 'string' && raw.trim()) {
    return raw;
  }
  return null;
}

function buildProfessorEndpoints(teacherId?: string): string[] {
  if (teacherId && teacherId.trim()) {
    return [`/api/grade-scheme/professor/${teacherId}`, '/api/grade-scheme/professor'];
  }
  return ['/api/grade-scheme/professor'];
}

export async function getSchemeForProfessor(teacherId: string): Promise<GradeSchemeForProfessor> {
  const endpoints = buildProfessorEndpoints(teacherId);
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.status === 404) {
        continue;
      }
      if (!response.ok) {
        throw new Error('Falha ao carregar divisão de notas');
      }
      const payload = await response.json();
      return {
        teacherId,
        items: normalizeSchemePayload(payload),
        updatedAt: extractUpdatedAt(payload),
      };
    } catch (error) {
      lastError = error as Error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return {
    teacherId,
    items: [],
    updatedAt: null,
  };
}

export async function saveSchemeForProfessor(items: GradeSchemeItems, teacherId?: string): Promise<void> {
  const endpoints = buildProfessorEndpoints(teacherId);
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (response.ok) {
        return;
      }
      if (response.status === 404 || response.status === 405) {
        continue;
      }
      const message = await response.text().catch(() => '');
      throw new Error(message || 'Falha ao salvar divisão de notas');
    } catch (error) {
      lastError = error as Error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Falha ao salvar divisão de notas');
}

export default {
  listSchemes,
  getScheme,
  upsertScheme,
  setVisibleScheme,
  normalizeScheme,
  getSchemeForProfessor,
  saveSchemeForProfessor,
};
