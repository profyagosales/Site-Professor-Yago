import { api, pickData } from '@/lib/api';

const BOOLEAN_TRUE = ['true', '1', 'yes', 'sim', 'on'];
const BOOLEAN_FALSE = ['false', '0', 'no', 'nao', 'off'];

function normalizeBooleanFlag(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const token = String(value).trim().toLowerCase();
  if (BOOLEAN_TRUE.includes(token)) return true;
  if (BOOLEAN_FALSE.includes(token)) return false;
  return undefined;
}

function clampBimester(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const integer = Math.trunc(parsed);
  if (integer < 1 || integer > 4) return undefined;
  return integer;
}

function extractClassName(raw) {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const name = raw.name || raw.className || raw.label || raw.classLabel;
    if (typeof name === 'string') return name;
    const series = raw.series ? `${raw.series}º${raw.letter ?? ''}`.trim() : '';
    const discipline = raw.discipline || raw.subject || '';
    return [series, discipline].filter(Boolean).join(' • ');
  }
  return '';
}

function serializeContentPayload(payload = {}) {
  const data = { ...payload };

  if (data.description !== undefined) {
    if (typeof data.description === 'string') {
      const trimmed = data.description.trim();
      data.description = trimmed ? trimmed : null;
    } else if (data.description === null) {
      data.description = null;
    }
  }

  if (data.date instanceof Date) {
    data.date = data.date.toISOString();
  }

  if (typeof data.bimester === 'string') {
    const parsed = Number(data.bimester);
    if (Number.isFinite(parsed)) {
      data.bimester = parsed;
    }
  }

  if (typeof data.done === 'string') {
    const normalized = data.done.trim().toLowerCase();
    if (BOOLEAN_TRUE.includes(normalized)) data.done = true;
    else if (BOOLEAN_FALSE.includes(normalized)) data.done = false;
  }

  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) {
      delete data[key];
    }
  });

  return data;
}

function normalizeContent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id : typeof raw._id === 'string' ? raw._id : null;
  const classId = typeof raw.classId === 'string' ? raw.classId : typeof raw.class === 'string' ? raw.class : raw.class?._id || null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : null;
  const bimester = clampBimester(raw.bimester ?? raw.term);
  const date = typeof raw.date === 'string'
    ? raw.date
    : typeof raw.dateISO === 'string'
      ? raw.dateISO
      : raw.date instanceof Date
        ? raw.date.toISOString()
        : null;

  if (!id || !classId || !title || !bimester || !date) {
    return null;
  }

  const description = typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : undefined;
  const done = normalizeBooleanFlag(raw.done);
  const base = {
    id,
    _id: id,
    classId: String(classId),
    className: extractClassName(raw.className ?? raw.classLabel ?? raw.class),
    bimester: bimester,
    title,
    description,
    date,
    done: done ?? false,
  };

  if (raw.createdAt) {
    base.createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : raw.createdAt instanceof Date ? raw.createdAt.toISOString() : undefined;
  }
  if (raw.updatedAt) {
    base.updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : undefined;
  }

  return base;
}

function parseListResponse(response) {
  const raw = response?.data ?? response ?? {};
  const data = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  const items = data.map((entry) => normalizeContent(entry)).filter(Boolean);
  const meta = raw?.meta || {};

  return {
    items,
    total: Number.isFinite(meta.total) ? Number(meta.total) : items.length,
    limit: Number.isFinite(meta.limit) ? Number(meta.limit) : items.length,
    offset: Number.isFinite(meta.offset) ? Number(meta.offset) : 0,
  };
}

export async function listContents(params = {}) {
  const response = await api.get('/contents', {
    params,
    meta: { noCache: true },
  });
  return parseListResponse(response);
}

export async function listUpcomingContents({ teacherId, daysAhead = 14, limit = 5 } = {}) {
  if (!teacherId) return [];
  const response = await api.get(`/teachers/${teacherId}/contents/upcoming`, {
    params: { daysAhead, limit },
    meta: { noCache: true },
  });
  const payload = pickData(response);
  if (!Array.isArray(payload)) return [];
  return payload.map((entry) => normalizeContent(entry)).filter(Boolean);
}

export async function createContent(payload) {
  const response = await api.post(
    '/contents',
    serializeContentPayload(payload),
    { meta: { noCache: true } },
  );
  const normalized = normalizeContent(pickData(response));
  if (!normalized) {
    return pickData(response);
  }
  return normalized;
}

export async function quickCreateContent(payload) {
  const mapped = {
    ...payload,
    bimester: Number.isFinite(payload?.bimester) ? payload.bimester : payload?.term,
  };
  if (mapped.term !== undefined) delete mapped.term;
  const response = await api.post(
    '/contents',
    serializeContentPayload(mapped),
    { meta: { noCache: true } },
  );
  const normalized = normalizeContent(pickData(response));
  if (!normalized) {
    return pickData(response);
  }
  return normalized;
}

export async function updateContent(id, payload) {
  const response = await api.put(
    `/contents/${id}`,
    serializeContentPayload(payload),
    { meta: { noCache: true } },
  );
  const normalized = normalizeContent(pickData(response));
  if (!normalized) {
    return pickData(response);
  }
  return normalized;
}

export async function deleteContent(id) {
  await api.delete(`/contents/${id}`, { meta: { noCache: true } });
  return true;
}

export async function toggleContentStatus(id, done) {
  return updateContent(id, { done });
}

export default {
  listContents,
  listUpcomingContents,
  createContent,
  quickCreateContent,
  updateContent,
  deleteContent,
  toggleContentStatus,
};
