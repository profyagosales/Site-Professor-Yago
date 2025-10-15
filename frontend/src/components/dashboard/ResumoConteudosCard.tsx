import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/services/api';

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

export default function ResumoConteudosCard() {
  const [itens, setItens] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await api.get('/professor/conteudos-resumo', {
          params: { limit: 5 },
          meta: { noCache: true },
        });
        if (cancelled) {
          return;
        }
        const payload = response?.data;
        const items = extractItems(payload).slice(0, 5);
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
  }, []);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-700">Resumo de conteúdos</h3>
        <Link to="/professor/conteudos" className="text-orange-600 hover:underline">
          Ver todos
        </Link>
      </div>

      {loading ? (
        <div className="h-28 rounded-xl bg-slate-100 animate-pulse" />
      ) : error ? (
        <p className="text-sm text-slate-500">{error}</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum conteúdo cadastrado recentemente.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {itens.map((conteudo) => (
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
      )}
    </div>
  );
}
