import { api } from '@/services/api';

export type GradeSchemeItem = {
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
  const label = typeof raw?.label === 'string' ? raw.label.trim() : '';
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
    label,
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

export default {
  listSchemes,
  getScheme,
  upsertScheme,
  setVisibleScheme,
  normalizeScheme,
};
