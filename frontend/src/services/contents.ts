import { api, pickData } from '@/lib/api';
import type { ContentItem } from '@/types/school';

export type ListContentsParams = {
  classId?: string;
  bimester?: number | string;
  from?: string;
  to?: string;
  done?: boolean | string;
  limit?: number;
  offset?: number;
  sort?: 'asc' | 'desc';
};

export type ContentsListResponse = {
  items: ContentItem[];
  total: number;
  limit: number;
  offset: number;
};

function normalizeBooleanFlag(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const candidate = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'sim', 'on'].includes(candidate)) return true;
  if (['false', '0', 'no', 'nao', 'off'].includes(candidate)) return false;
  return undefined;
}

function normalizeContent(raw: any): ContentItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id : typeof raw._id === 'string' ? raw._id : null;
  const classId = typeof raw.classId === 'string' ? raw.classId : typeof raw.class === 'string' ? raw.class : null;
  const className = typeof raw.className === 'string' ? raw.className : typeof raw.classLabel === 'string' ? raw.classLabel : null;
  const bimester = Number(raw.bimester);
  const title = typeof raw.title === 'string' ? raw.title : null;
  const description = typeof raw.description === 'string' ? raw.description : undefined;
  const date = typeof raw.date === 'string' ? raw.date : typeof raw.dateISO === 'string' ? raw.dateISO : null;
  const done = normalizeBooleanFlag(raw.done) ?? false;

  if (!id || !classId || !title || !date || !Number.isFinite(bimester) || bimester < 1 || bimester > 4) {
    return null;
  }

  return {
    id,
    classId,
    className: className ?? '',
    bimester: Math.min(Math.max(bimester, 1), 4) as 1 | 2 | 3 | 4,
    title,
    description,
    date,
    done,
  };
}

export async function listContents(params: ListContentsParams = {}): Promise<ContentsListResponse> {
  const response = await api.get('/contents', {
    params,
    meta: { noCache: true } as any,
  } as any);

  const payload = pickData(response);
  const data = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  const meta = (payload && typeof payload === 'object' ? payload.meta : undefined) || {};

  const items = data
    .map((entry) => normalizeContent(entry))
    .filter((entry): entry is ContentItem => Boolean(entry));

  return {
    items,
    total: Number.isFinite(meta.total) ? Number(meta.total) : items.length,
    limit: Number.isFinite(meta.limit) ? Number(meta.limit) : items.length,
    offset: Number.isFinite(meta.offset) ? Number(meta.offset) : 0,
  };
}

export async function toggleContentStatus(contentId: string, done: boolean): Promise<ContentItem> {
  const response = await api.patch(
    `/contents/${contentId}`,
    { done },
    { meta: { noCache: true } as any } as any,
  );

  const payload = pickData(response);
  const normalized = normalizeContent(payload);
  if (!normalized) {
    throw new Error('Resposta inválida ao atualizar conteúdo.');
  }
  return normalized;
}
