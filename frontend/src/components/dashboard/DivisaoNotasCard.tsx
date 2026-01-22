import { useEffect, useMemo, useRef, useState } from 'react';
import cn from '@/utils/cn';
import {
  DEFAULT_SCHEME,
  GRADE_SCHEME_DEFAULT_STORAGE_KEY,
  fetchGradeScheme,
  fetchTeacherGradeSplitSettings,
  type Bimestre,
  type GradeScheme,
  type GradeSchemeItem,
} from '@/services/gradeScheme';
import { Button } from '@/components/ui/Button';

const BIMESTERS: Bimestre[] = [1, 2, 3, 4];

type Props = {
  ano: number;
  classId: string | null;
  teacherId: string | null;
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

export default function DivisaoNotasCard({
  ano,
  classId,
  teacherId,
  onEdit,
  refreshToken = 0,
  className,
}: Props) {
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
    if (!stored) {
      return;
    }
    const value = Number(stored);
    if (BIMESTERS.includes(value as Bimestre)) {
      setDefaultBimester(value as Bimestre);
      if (!userSelectedRef.current) {
        setSelectedBimester(value as Bimestre);
      }
    }
  }, [teacherId]);

  useEffect(() => {
    if (!teacherId) {
      userSelectedRef.current = false;
      return;
    }
    let cancelled = false;
    async function loadConfig() {
      try {
        const config = await fetchTeacherGradeSplitSettings({ teacherId });
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
  }, [ano, classId, teacherId, refreshToken]);

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
    bodyContent = itens.length ? (
      <div className="grade-columns-scroll">
        <div className="grade-columns-container">
          {[leftItems, rightItems].map((columnItems, index) => (
            <div className="grade-column" key={`grade-column-${index}`}>
              <div className="grade-column__header">
                <span>Item</span>
                <span className="text-right">Pontos</span>
              </div>
              <div className="grade-column__body">
                {columnItems.length ? (
                  columnItems.map((item) => <LinhaItem key={item.id} item={item} />)
                ) : (
                  <p className="grade-column__empty" aria-hidden="true">
                    —
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
        <p className="text-sm text-slate-500">Sem itens no bimestre selecionado.</p>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleEdit}
          disabled={!classId}
        >
          Adicionar itens
        </Button>
      </div>
    );
  }

  return (
    <section
      className={cn(
        'dash-card h-full',
        className,
      )}
    >
      <header className="dash-card__header">
        <h2 className="dash-card__title">Divisão de notas</h2>
        
        <div className="hidden items-center justify-center gap-2 flex-1 md:flex">
          {BIMESTERS.map((bim) => (
            <button
              key={bim}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300',
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

        <div className="dash-card__actions">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleEdit}
            disabled={!classId}
          >
            Editar
          </Button>
        </div>
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
    <div className="grade-row">
      <div className="grade-row__item" style={{ backgroundColor: background }}>
        <span className="grade-row__item-text">{name}</span>
      </div>
      <span className="grade-row__points">{points} pts</span>
    </div>
  );
}

function formatPoints(value: number) {
  return Number(value ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
