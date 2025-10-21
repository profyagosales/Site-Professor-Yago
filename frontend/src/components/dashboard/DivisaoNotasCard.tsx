import { useEffect, useMemo, useRef, useState } from 'react';
import cn from '@/utils/cn';
import {
  DEFAULT_SCHEME,
  GRADE_SCHEME_DEFAULT_STORAGE_KEY,
  fetchGradeScheme,
  fetchGradeSchemeConfig,
  type Bimestre,
  type GradeScheme,
  type GradeSchemeItem,
} from '@/services/gradeScheme';

const BIMESTERS: Bimestre[] = [1, 2, 3, 4];

type Props = {
  ano: number;
  classId: string | null;
  onEdit: (payload: {
    scheme: GradeScheme;
    defaultBimester: Bimestre;
    currentBimester: Bimestre;
  }) => void;
  refreshToken?: number;
  className?: string;
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

export default function DivisaoNotasCard({ ano, classId, onEdit, refreshToken = 0, className }: Props) {
  const [selectedBimester, setSelectedBimester] = useState<Bimestre>(1);
  const [defaultBimester, setDefaultBimester] = useState<Bimestre>(1);
  const [scheme, setScheme] = useState<GradeScheme | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const userSelectedRef = useRef(false);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(GRADE_SCHEME_DEFAULT_STORAGE_KEY);
    if (stored) {
      const value = Number(stored);
      if (BIMESTERS.includes(value as Bimestre)) {
        setDefaultBimester(value as Bimestre);
        setSelectedBimester(value as Bimestre);
      }
    }
  }, []);

  useEffect(() => {
    if (!classId) {
      userSelectedRef.current = false;
      return;
    }
    let cancelled = false;
    async function loadConfig() {
      try {
        const config = await fetchGradeSchemeConfig({ classId, year: ano });
        if (cancelled || !config) {
          return;
        }
        setDefaultBimester(config);
        if (typeof window !== 'undefined') {
          localStorage.setItem(GRADE_SCHEME_DEFAULT_STORAGE_KEY, String(config));
        }
        if (!userSelectedRef.current) {
          setSelectedBimester(config);
        }
      } catch (error) {
        // Configuração opcional indisponível: usa fallback local
      }
    }

    userSelectedRef.current = false;
    loadConfig();
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
    onEdit({
      scheme: scheme ?? DEFAULT_SCHEME(classId, ano),
      defaultBimester,
      currentBimester: selectedBimester,
    });
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
  } else {
    bodyContent = (
      <div className="flex h-full flex-col">
        <div className="grid grid-cols-2 gap-6 px-1 pb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <span>Item</span>
            <span className="text-right">Pontos</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <span>Item</span>
            <span className="text-right">Pontos</span>
          </div>
        </div>
        <div className="relative flex-1 min-h-0">
          <div className="max-h-[300px] md:max-h-[320px] overflow-y-auto pr-1">
            {itens.length ? (
              <div className="grid grid-cols-2 gap-6 pb-2">
                <div className="flex flex-col gap-3">
                  {leftItems.map((item) => (
                    <LinhaItem key={item.id} item={item} />
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  {rightItems.map((item) => (
                    <LinhaItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="col-span-2 flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
                <p className="text-sm text-slate-500">Sem itens no bimestre selecionado.</p>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                  disabled={!classId}
                >
                  Adicionar itens
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        'flex h-full flex-col rounded-3xl bg-white p-6 shadow-[0_1px_0_rgba(10,10,10,.04)] ring-1 ring-black/5 md:p-7',
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900 md:text-[26px]">Divisão de notas</h2>
          <div className="hidden items-center gap-2 md:flex">
            {BIMESTERS.map((bim) => (
              <button
                key={bim}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300',
                  selectedBimester === bim
                    ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
                type="button"
                aria-pressed={selectedBimester === bim}
                onClick={() => {
                  userSelectedRef.current = true;
                  setSelectedBimester(bim);
                }}
              >
                {bim}º
              </button>
            ))}
          </div>
        </div>

        <button
          className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleEdit}
          disabled={!classId}
        >
          Editar
        </button>
      </header>

      <div className="flex-1 min-h-0">
        {bodyContent}
      </div>
    </section>
  );
}

function LinhaItem({ item }: { item: GradeSchemeItem }) {
  const name = item.name || item.label || 'Sem nome';
  const points = formatPoints(item.points);
  const baseColor =
    item.color && /^#([0-9a-f]{3}){1,2}$/i.test(item.color) ? item.color : '#EB7A28';
  const background = `${baseColor}1A`;

  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl px-4 py-3 text-slate-900 ring-1 ring-black/5 transition hover:ring-black/10 hover:shadow-sm md:px-5 md:py-3.5"
      style={{ backgroundColor: background }}
    >
      <span className="truncate text-[15px] font-semibold md:text-[16px]">{name}</span>
      <span className="text-right text-[14px] font-bold text-slate-900/90 md:text-[15px]">{points} pts</span>
    </div>
  );
}

function formatPoints(value: number) {
  return Number(value ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
