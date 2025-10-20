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

const AGENDA_ROUTE_CANDIDATES = ['/agenda', '/agendas', '/professor/agenda'] as const;

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
      const dateValue = typeof raw.data === 'string' ? raw.data : typeof raw.date === 'string' ? raw.date : null;
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

export async function listAgenda(params: { limit?: number } = {}): Promise<AgendaListItem[]> {
  try {
    const { data } = await api.get<AgendaSummaryResponse>('/professor/conteudos-resumo', {
      params,
      meta: { noCache: true },
    });

    if (!data) {
      return [];
    }

    if (Array.isArray((data as any).items)) {
      return normalizeAgendaItems((data as any).items);
    }

    if (Array.isArray((data as any).data?.items)) {
      return normalizeAgendaItems((data as any).data?.items);
    }

    if (Array.isArray((data as any).data)) {
      return normalizeAgendaItems((data as any).data);
    }
  } catch (err: any) {
    if (err?.response?.status !== 404) {
      throw err;
    }
  }

  for (const base of AGENDA_ROUTE_CANDIDATES) {
    try {
      const { data } = await api.get(base, { params, meta: { noCache: true } });
      const payload: unknown = Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.data?.items)
          ? (data as any).data.items
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : data;
      return normalizeAgendaItems(payload);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        throw err;
      }
    }
  }

  throw new Error('API route not found');
}

export async function createAgendaItem(payload: AgendaItemPayload) {
  for (const base of AGENDA_ROUTE_CANDIDATES) {
    try {
      const { data } = await api.post(base, payload, { meta: { noCache: true } });
      return data;
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        throw err;
      }
    }
  }

  throw new Error('API route not found');
}

export async function updateAgendaItem(id: string, payload: AgendaUpdatePayload) {
  for (const base of AGENDA_ROUTE_CANDIDATES) {
    try {
      const { data } = await api.put(`${base}/${id}`, payload, { meta: { noCache: true } });
      return data;
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        throw err;
      }
    }
  }

  throw new Error('API route not found');
}

export async function deleteAgendaItem(id: string) {
  for (const base of AGENDA_ROUTE_CANDIDATES) {
    try {
      await api.delete(`${base}/${id}`, { meta: { noCache: true } });
      return;
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        throw err;
      }
    }
  }

  throw new Error('API route not found');
}

export default {
  listAgenda,
  createAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
};
