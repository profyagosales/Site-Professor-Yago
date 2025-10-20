import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SCHEME,
  fetchGradeScheme,
  type Bimestre,
  type GradeScheme,
  type GradeSchemeItem,
} from '@/services/gradeScheme';

const BIMESTERS: Bimestre[] = [1, 2, 3, 4];

type Props = {
  ano: number;
  classId: string | null;
  onEdit: (scheme: GradeScheme) => void;
  refreshToken?: number;
};

function splitOddEven<T>(items: T[]) {
  const left: T[] = [];
  const right: T[] = [];
  items.forEach((value, index) => {
    if (index % 2 === 0) {
      left.push(value);
    } else {
      right.push(value);
    }
  });
  return { left, right };
}

export default function DivisaoNotasCard({ ano, classId, onEdit, refreshToken = 0 }: Props) {
  const [selectedBimester, setSelectedBimester] = useState<Bimestre>(1);
  const [scheme, setScheme] = useState<GradeScheme | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!classId) {
        setScheme(null);
        setErrorMessage(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchGradeScheme({ classId, year: ano });
        if (cancelled) return;
        setScheme(data);
      } catch (err: any) {
        if (cancelled) return;
        setScheme(DEFAULT_SCHEME(classId, ano));
        const msg = typeof err?.message === 'string' && err.message ? err.message : null;
        setErrorMessage(msg);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ano, classId, refreshToken]);

  const itens = useMemo(() => {
    if (!scheme) return [] as GradeSchemeItem[];
    return scheme.byBimester?.[selectedBimester]?.items ?? [];
  }, [scheme, selectedBimester]);

  const { left: leftItems, right: rightItems } = useMemo(() => splitOddEven(itens), [itens]);

  const handleEdit = () => {
    if (!classId) return;
    onEdit(scheme ?? DEFAULT_SCHEME(classId, ano));
  };

  let bodyContent: JSX.Element;

  if (!classId) {
    bodyContent = (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
        Cadastre uma turma para configurar a divisão de notas.
      </div>
    );
  } else if (loading) {
    bodyContent = (
      <div className="flex h-full items-center justify-center px-4 text-sm text-slate-500">
        Carregando divisão de notas…
      </div>
    );
  } else if (errorMessage) {
    bodyContent = (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-rose-600">
        {errorMessage}
      </div>
    );
  } else if (!itens.length) {
    bodyContent = (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
        Nenhum item cadastrado para este bimestre. Clique em <strong>Editar</strong> para começar.
      </div>
    );
  } else {
    bodyContent = (
      <div className="flex h-full flex-col">
        <div className="grid grid-cols-1 gap-4 px-1 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid-cols-2">
          <div className="grid grid-cols-[1fr_auto]">
            <span>Item</span>
            <span className="text-right">Pontos</span>
          </div>
          <div className="hidden grid-cols-[1fr_auto] md:grid">
            <span>Item</span>
            <span className="text-right">Pontos</span>
          </div>
        </div>
        <div className="flex-1 card-scroll-y px-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ rowGap: '12px' }}>
            <ul className="space-y-3">
              {leftItems.map((item) => (
                <li key={item.id}>
                  <LinhaItem item={item} />
                </li>
              ))}
            </ul>
            <ul className="space-y-3">
              {rightItems.map((item) => (
                <li key={item.id}>
                  <LinhaItem item={item} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="card flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">Divisão de notas</h2>
        <div className="flex items-center gap-2">
          {BIMESTERS.map((bim) => (
            <button
              key={bim}
              className="bimestre-pill"
              type="button"
              aria-pressed={selectedBimester === bim}
              onClick={() => setSelectedBimester(bim)}
            >
              {bim}º
            </button>
          ))}
        </div>
        <button className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={handleEdit} disabled={!classId}>
          Editar
        </button>
      </header>

      <div className="mt-3 flex-1 min-h-0">
        {bodyContent}
      </div>
    </section>
  );
}

function LinhaItem({ item }: { item: GradeSchemeItem }) {
  const name = item.name || item.label || 'Sem nome';
  const points = formatPoints(item.points);
  const background = item.color && /^#([0-9a-f]{3}){1,2}$/i.test(item.color) ? item.color : '#F6F7FB';

  return (
    <div
      className="grid h-14 grid-cols-[1fr_auto] items-center rounded-xl px-4"
      style={{ backgroundColor: background }}
    >
      <span className="truncate text-sm font-medium text-slate-800">{name}</span>
      <span className="text-sm font-semibold text-slate-900">{points} pts</span>
    </div>
  );
}

function formatPoints(value: number) {
  return Number(value ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
