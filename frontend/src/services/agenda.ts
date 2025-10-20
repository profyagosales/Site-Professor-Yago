import { api } from '@/services/api';

export type AgendaItemType = 'ATIVIDADE' | 'CONTEUDO' | 'DATA';

export type AgendaListItem = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  classId: string | null;
  className: string | null;
  type: AgendaItemType;
};

export type AgendaItemPayload = {
  title: string;
  description?: string | null;
  date: string;
  classId?: string | null;
  type: AgendaItemType;
};

export type AgendaUpdatePayload = Partial<AgendaItemPayload>;

type AgendaSummaryResponse = {
  success?: boolean;
  data?: unknown;
  items?: unknown;
};

const AGENDA_BASE_ROUTE = '/professor/agenda';

function normalizeAgendaType(value: unknown): AgendaItemType {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized === 'ATIVIDADE' || normalized === 'CONTEUDO' || normalized === 'DATA') {
    return normalized;
  }
  return 'CONTEUDO';
}

function normalizeAgendaItems(source: unknown): AgendaListItem[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const raw = entry as Record<string, unknown>;
      const id = typeof raw.id === 'string' ? raw.id : typeof raw._id === 'string' ? raw._id : null;
      const title = typeof raw.titulo === 'string' ? raw.titulo : typeof raw.title === 'string' ? raw.title : null;
      const description =
        typeof raw.descricao === 'string'
          ? raw.descricao
          : typeof raw.description === 'string'
            ? raw.description
            : typeof raw.resumo === 'string'
              ? raw.resumo
              : null;
      const dateValue =
        typeof raw.dataIso === 'string'
          ? raw.dataIso
          : typeof raw.data === 'string'
            ? raw.data
            : typeof raw.date === 'string'
              ? raw.date
              : null;
      const classId = typeof raw.turmaId === 'string' ? raw.turmaId : typeof raw.classId === 'string' ? raw.classId : null;
      const className =
        typeof raw.turmaNome === 'string'
          ? raw.turmaNome
          : typeof raw.className === 'string'
            ? raw.className
            : null;

      if (!id || !title || !dateValue) {
        return null;
      }

      return {
        id,
        title,
        description: description ?? null,
        date: dateValue,
        classId,
        className,
        type: normalizeAgendaType(raw.tipo ?? raw.type),
      } satisfies AgendaListItem;
    })
    .filter(Boolean) as AgendaListItem[];
}

export type AgendaQueryParams = {
  from?: string;
  to?: string;
  tipo?: 'all' | 'atividade' | 'conteudo' | 'data';
  limit?: number;
};

function buildRequestBody(payload: Partial<AgendaItemPayload>): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    body.titulo = payload.title;
    body.title = payload.title;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
    body.descricao = payload.description;
    body.description = payload.description;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'date')) {
    body.data = payload.date;
    body.date = payload.date;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'classId')) {
    body.turmaId = payload.classId;
    body.classId = payload.classId;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'type')) {
    body.tipo = payload.type;
    body.type = payload.type;
  }

  return body;
}

export async function listAgenda(params: AgendaQueryParams = {}): Promise<AgendaListItem[]> {
  const query: Record<string, string | number> = {};
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.tipo) query.tipo = params.tipo;
  if (typeof params.limit === 'number') query.limit = params.limit;

  const { data } = await api.get<AgendaSummaryResponse>(AGENDA_BASE_ROUTE, {
    params: query,
    meta: { noCache: true },
  });

  if (!data) {
    return [];
  }

  if (Array.isArray((data as any).data)) {
    return normalizeAgendaItems((data as any).data);
  }

  return normalizeAgendaItems(data);
}

export async function createAgendaItem(payload: AgendaItemPayload) {
  const requestBody = buildRequestBody(payload);
  const { data } = await api.post(AGENDA_BASE_ROUTE, requestBody, { meta: { noCache: true } });
  return data;
}

export async function updateAgendaItem(id: string, payload: AgendaUpdatePayload) {
  const requestBody = buildRequestBody(payload);
  const { data } = await api.put(`${AGENDA_BASE_ROUTE}/${id}`, requestBody, { meta: { noCache: true } });
  return data;
}

export async function deleteAgendaItem(id: string) {
  await api.delete(`${AGENDA_BASE_ROUTE}/${id}`, { meta: { noCache: true } });
}

export default {
  listAgenda,
  createAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
};
