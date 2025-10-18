import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';

type ConteudoTipo = 'ATIVIDADE' | 'CONTEUDO' | 'DATA';

type Conteudo = {
  id: string;
  titulo: string;
  turmaNome: string;
  tipo: ConteudoTipo;
  data: string;
};

type ApiPayload = {
  items?: unknown;
  data?: unknown;
};

type ResumoConteudosCardProps = {
  embedded?: boolean;
  onViewAll?: (items: Conteudo[]) => void;
  limit?: number;
  className?: string;
};

function normalizeTipo(value: unknown): ConteudoTipo {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized === 'ATIVIDADE' || normalized === 'CONTEUDO' || normalized === 'DATA') {
    return normalized;
  }
  return 'CONTEUDO';
}

function normalizeItems(source: unknown): Conteudo[] {
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
      const titulo = typeof raw.titulo === 'string' ? raw.titulo : typeof raw.title === 'string' ? raw.title : null;
      const turmaNome = typeof raw.turmaNome === 'string'
        ? raw.turmaNome
        : typeof raw.className === 'string'
          ? raw.className
          : null;
      const data = typeof raw.data === 'string' ? raw.data : typeof raw.date === 'string' ? raw.date : null;

      if (!id || !titulo || !turmaNome || !data) {
        return null;
      }

      return {
        id,
        titulo,
        turmaNome,
        data,
        tipo: normalizeTipo(raw.tipo ?? raw.type),
      } satisfies Conteudo;
    })
    .filter(Boolean) as Conteudo[];
}

function extractItems(payload: unknown): Conteudo[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const raw = payload as ApiPayload;
  const primary = normalizeItems(raw.items);
  if (primary.length) {
    return primary;
  }

  const nestedData = normalizeItems((raw.data as any)?.items ?? raw.data);
  return nestedData;
}

function formatDate(iso: string): string {
  try {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      return 'Data não disponível';
    }
    return format(parsed, "d 'de' LLL", { locale: ptBR });
  } catch (err) {
    console.warn('Falha ao formatar data do conteúdo', iso, err);
    return 'Data não disponível';
  }
}

export default function ResumoConteudosCard({
  embedded = false,
  onViewAll,
  limit = 5,
  className = '',
}: ResumoConteudosCardProps) {
  const [itens, setItens] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

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
        const items = extractItems(payload);
        setItens(items);
      } catch (err) {
        console.error('Falha ao carregar resumo de conteúdos', err);
        if (!cancelled) {
          setItens([]);
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
    const handler = () => {
      setRefreshToken((token) => token + 1);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('contents:refresh', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('contents:refresh', handler);
      }
    };
  }, []);

  const displayedItems = useMemo(() => itens.slice(0, limit), [itens, limit]);
  const hasMore = itens.length > limit;

  const containerClass = embedded
    ? ['flex h-full flex-col', className].filter(Boolean).join(' ')
    : ['flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className]
        .filter(Boolean)
        .join(' ');

  const content = () => {
    if (loading) {
      return <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100" />;
    }
    if (error) {
      return <p className="text-sm text-slate-500">{error}</p>;
    }
    if (displayedItems.length === 0) {
      return <p className="text-sm text-slate-500">Nenhum conteúdo cadastrado recentemente.</p>;
    }
    return (
      <ul className="divide-y divide-slate-100">
        {displayedItems.map((conteudo) => (
          <li key={conteudo.id} className="flex items-start gap-3 py-3">
            <span className="mt-1 shrink-0 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
              {conteudo.tipo}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">{conteudo.titulo}</p>
              <p className="text-sm text-slate-500">
                {conteudo.turmaNome} • {formatDate(conteudo.data)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="ys-card-title text-slate-900">Resumo de conteúdos</h3>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">{content()}</div>
      {hasMore && (
        <div className="mt-4 flex justify-end">
          <Button variant="link" onClick={() => onViewAll && onViewAll(itens)}>
            Ver todos
          </Button>
        </div>
      )}
    </div>
  );
}
