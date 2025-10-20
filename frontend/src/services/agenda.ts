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

  return [];
}

export async function createAgendaItem(payload: AgendaItemPayload) {
  const { data } = await api.post('/agenda', payload, { meta: { noCache: true } });
  return data;
}

export async function updateAgendaItem(id: string, payload: AgendaUpdatePayload) {
  const { data } = await api.put(`/agenda/${id}`, payload, { meta: { noCache: true } });
  return data;
}

export async function deleteAgendaItem(id: string) {
  await api.delete(`/agenda/${id}`, { meta: { noCache: true } });
  return true;
}

export default {
  listAgenda,
  createAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
};
