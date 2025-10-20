import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/api';
import AgendaEditorModal from '@/components/dashboard/AgendaEditorModal';

type AgendaItemType = 'ATIVIDADE' | 'CONTEUDO' | 'DATA';

type SummaryItem = {
  id: string;
  title: string;
  classId: string | null;
  className: string | null;
  disciplineName: string | null;
  description: string | null;
  type: AgendaItemType;
  date: string;
  source?: string | null;
};

type ApiPayload = {
  items?: unknown;
  data?: unknown;
};

type ResumoConteudosCardProps = {
  embedded?: boolean;
  limit?: number;
  className?: string;
};

const MODAL_PAGE_SIZE = 6;
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const DAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });
const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

const TYPE_LABELS: Record<AgendaItemType, string> = {
  ATIVIDADE: 'Atividades',
  CONTEUDO: 'Conteúdos',
  DATA: 'Datas',
};

type FilterOption = 'ALL' | AgendaItemType;

function normalizeAgendaType(value: unknown): AgendaItemType {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized === 'ATIVIDADE' || normalized === 'CONTEUDO' || normalized === 'DATA') {
    return normalized;
  }
  return 'CONTEUDO';
}

function normalizeSummaryItems(source: unknown): SummaryItem[] {
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
      const classId =
        typeof raw.turmaId === 'string'
          ? raw.turmaId
          : typeof raw.classId === 'string'
            ? raw.classId
            : typeof raw.class_id === 'string'
              ? raw.class_id
              : null;
      const className = typeof raw.turmaNome === 'string'
        ? raw.turmaNome
        : typeof raw.className === 'string'
          ? raw.className
          : null;
      const disciplineName = typeof raw.disciplinaNome === 'string'
        ? raw.disciplinaNome
        : typeof raw.disciplina === 'string'
          ? raw.disciplina
          : typeof raw.discipline === 'string'
            ? raw.discipline
            : null;
      const description = typeof raw.descricao === 'string'
        ? raw.descricao
        : typeof raw.description === 'string'
          ? raw.description
          : typeof raw.resumo === 'string'
            ? raw.resumo
            : null;
      const dateValue = typeof raw.data === 'string' ? raw.data : typeof raw.date === 'string' ? raw.date : null;

      if (!id || !title || !dateValue) {
        return null;
      }

      return {
        id,
        title,
        classId,
        className,
        disciplineName,
        description,
        date: dateValue,
        type: normalizeAgendaType(raw.tipo ?? raw.type),
        source: typeof raw.source === 'string' ? raw.source : null,
      } satisfies SummaryItem;
    })
    .filter(Boolean) as SummaryItem[];
}

function extractSummaryItems(payload: unknown): SummaryItem[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const raw = payload as ApiPayload;
  const primary = normalizeSummaryItems(raw.items);
  if (primary.length) {
    return primary;
  }

  const nestedData = normalizeSummaryItems((raw.data as any)?.items ?? raw.data);
  return nestedData;
}

function formatAgendaDate(value: string | Date): string {
  try {
    const parsed = typeof value === 'string' ? new Date(value) : value;
    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
      return 'Data não disponível';
    }
    const weekdayRaw = WEEKDAY_FORMATTER.format(parsed).replace('.', '');
    const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
    const day = DAY_FORMATTER.format(parsed);
    const month = MONTH_FORMATTER.format(parsed).replace('.', '');
    const year = parsed.getFullYear();
    return `${weekday} • ${day} ${month} ${year}`;
  } catch (err) {
    console.warn('Falha ao formatar data do conteúdo', value, err);
    return 'Data não disponível';
  }
}

export default function ResumoConteudosCard({
  embedded = false,
  limit = 5,
  className = '',
}: ResumoConteudosCardProps) {
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [agendaEditorOpen, setAgendaEditorOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await api.get('/professor/conteudos-resumo', {
          params: { limit: Math.max(limit, 5) },
          meta: { noCache: true },
        });
        if (cancelled) {
          return;
        }
        const payload = response?.data;
        const items = extractSummaryItems(payload);
        setSummaryItems(items);
      } catch (err) {
        console.error('Falha ao carregar resumo de conteúdos', err);
        if (!cancelled) {
          setSummaryItems([]);
          setError('Não foi possível carregar o resumo.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit, refreshToken]);

  useEffect(() => {
    if (activeFilter === 'ALL') {
      return;
    }
    const hasItemsForFilter = summaryItems.some((item) => item.type === activeFilter);
    if (!hasItemsForFilter) {
      setActiveFilter('ALL');
    }
  }, [activeFilter, summaryItems]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'ALL') {
      return summaryItems;
    }
    return summaryItems.filter((item) => item.type === activeFilter);
  }, [summaryItems, activeFilter]);

  const displayedItems = useMemo(() => filteredItems.slice(0, limit), [filteredItems, limit]);

  const containerClass = embedded
    ? ['flex h-full min-h-0 flex-col gap-4', className].filter(Boolean).join(' ')
    : [
        'flex h-full min-h-[26rem] flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ');

  const typeCounts = useMemo(() => {
    return summaryItems.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + 1;
        return acc;
      },
      { ATIVIDADE: 0, CONTEUDO: 0, DATA: 0 } as Record<AgendaItemType, number>
    );
  }, [summaryItems]);

  const agendaItemsForEditor = useMemo(
    () =>
      summaryItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? '',
        date: item.date,
        classId: item.classId ?? '',
        className: item.className ?? '',
        type: item.type,
      })),
    [summaryItems],
  );

  const renderTypeFilters = () => (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setActiveFilter('ALL')}
        className={`chip px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
          activeFilter === 'ALL'
            ? 'bg-orange-100 text-orange-600 shadow-sm'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        aria-pressed={activeFilter === 'ALL'}
      >
        Todos
      </button>
      {(Object.keys(TYPE_LABELS) as AgendaItemType[]).map((type) => {
        const count = typeCounts[type] ?? 0;
        return (
          <button
            key={type}
            type="button"
            onClick={() => setActiveFilter(type)}
            className={`chip px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              activeFilter === type
                ? 'bg-orange-100 text-orange-600 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            aria-pressed={activeFilter === type}
            disabled={count === 0}
          >
            {TYPE_LABELS[type]}
            <span className="ml-1 text-[11px] font-medium text-slate-500">{count}</span>
          </button>
        );
      })}
    </div>
  );

  const handleOpenAgendaModal = () => {
    setAgendaEditorOpen(true);
  };

  const handleAgendaUpdated = () => {
    setRefreshToken((token) => token + 1);
  };

  const content = () => {
    if (loading) {
      return <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100" />;
    }
    if (error) {
      return <p className="text-sm text-slate-500">{error}</p>;
    }
    if (displayedItems.length === 0) {
      const emptyMessage =
        activeFilter === 'ALL'
          ? 'Nenhuma atividade cadastrada recentemente.'
          : 'Nenhuma atividade para este tipo.';
      return <p className="text-sm text-slate-500">{emptyMessage}</p>;
    }
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ul
          className="flex-1 space-y-3 overflow-y-auto pr-2"
          role="region"
          aria-label="Próximas atividades agendadas"
        >
          {displayedItems.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[item.className, item.disciplineName].filter(Boolean).join(' • ')}
                  </p>
                  {item.description ? (
                    <p className="truncate text-xs text-slate-600">{item.description}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                  {TYPE_LABELS[item.type]}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                {formatAgendaDate(item.date)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={!embedded ? 'card-title text-slate-900' : 'text-sm font-semibold text-slate-900'}>
          {embedded ? 'Agenda' : 'Próximas Atividades'}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleOpenAgendaModal}
          disabled={loading && summaryItems.length === 0}
        >
          Editar
        </Button>
      </div>
      {renderTypeFilters()}
      <div className="min-h-0 flex-1">{content()}</div>
      <AgendaEditorModal
        open={agendaEditorOpen}
        onClose={() => setAgendaEditorOpen(false)}
        initialItems={agendaItemsForEditor}
        onSaved={handleAgendaUpdated}
      />
    </div>
  );
}
