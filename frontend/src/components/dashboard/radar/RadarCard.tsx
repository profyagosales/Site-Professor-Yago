import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { fetchRadarData } from '@/services/radar';
import type {
  RadarDataset,
  RadarFilters,
  RadarCompareSlot,
} from '@/types/radar';
import RadarFiltersBar, { type RadarFilterOption } from './RadarFiltersBar';
import type { RadarDraggablePayload } from './dragAndDrop';

const RadarKpisRow = lazy(() => import('./RadarKpisRow'));
const RankingList = lazy(() => import('./RankingList'));
const ScatterAvatars = lazy(() => import('./ScatterAvatars'));
const TimelineBrush = lazy(() => import('./TimelineBrush'));
const DistributionChart = lazy(() => import('./DistributionChart'));
const ApprovalDonut = lazy(() => import('./ApprovalDonut'));
const TopScoresTable = lazy(() => import('./TopScoresTable'));

type FiltersAction =
  | { type: 'merge'; payload: Partial<RadarFilters> }
  | { type: 'replace'; payload: RadarFilters };

type RadarCardProps = {
  role?: string;
  currentStudentId?: string | null;
};

const initialFilters: RadarFilters = {
  year: new Date().getFullYear(),
  classes: [],
  bimesters: [1],
  groupBy: 'class',
  compare: { A: [], B: [] },
};

function ensureCompare(value?: RadarFilters['compare']) {
  return {
    A: value?.A ? [...value.A] : [],
    B: value?.B ? [...value.B] : [],
  };
}

function filtersReducer(state: RadarFilters, action: FiltersAction): RadarFilters {
  switch (action.type) {
    case 'replace': {
      const next = { ...action.payload };
      next.compare = ensureCompare(next.compare);
      return next;
    }
    case 'merge': {
      const merged = { ...state, ...action.payload } as RadarFilters;
      merged.compare = ensureCompare((action.payload as RadarFilters)?.compare ?? state.compare);
      if (!Array.isArray(merged.classes)) merged.classes = [];
      if (!Array.isArray(merged.bimesters)) merged.bimesters = [];
      return merged;
    }
    default:
      return state;
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const handle = () => {
      setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return isMobile;
}

function LoadingFallback() {
  return <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />;
}

export default function RadarCard({ role = 'teacher', currentStudentId }: RadarCardProps) {
  const [filters, dispatch] = useReducer(filtersReducer, initialFilters);
  const [dataset, setDataset] = useState<RadarDataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [openPanel, setOpenPanel] = useState<string>('ranking');

  useEffect(() => {
    let cancelled = false;
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setLoading(true);
      fetchRadarData(filters)
        .then((data) => {
          if (cancelled) return;
          setDataset(data);
          setError(null);
        })
        .catch((err) => {
          console.error('[RadarCard] failed to load dataset', err);
          if (!cancelled) {
            setError('Não foi possível carregar os dados do radar.');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters]);

  useEffect(() => {
    if (!isMobile) {
      setOpenPanel('');
    } else if (!openPanel) {
      setOpenPanel('ranking');
    }
  }, [isMobile, openPanel]);

  const sanitizedDataset = useMemo(() => {
    if (!dataset) return null;
    if (role !== 'student') return dataset;
    let alias = 1;
    return {
      ...dataset,
      students: dataset.students.map((student) => {
        if (currentStudentId && student.id === currentStudentId) {
          return student;
        }
        const placeholder = `Colega ${alias++}`;
        return {
          ...student,
          name: placeholder,
          avatarUrl: null,
          initials: placeholder
            .split(' ')
            .map((part) => part.charAt(0))
            .join('')
            .toUpperCase(),
        };
      }),
    } satisfies RadarDataset;
  }, [dataset, role, currentStudentId]);

  const compare = useMemo(() => ensureCompare(filters.compare), [filters.compare]);

  const classOptions: RadarFilterOption[] = useMemo(
    () =>
      (sanitizedDataset?.classes ?? []).map((cls) => ({
        value: cls.id,
        label: cls.name,
        color: cls.color,
      })),
    [sanitizedDataset?.classes]
  );

  const subjectOptions: RadarFilterOption[] = useMemo(() => {
    const subjects = new Map<string, string>();
    sanitizedDataset?.classes.forEach((cls) => {
      if (cls.subject) subjects.set(cls.subject, cls.subject);
    });
    return Array.from(subjects.keys()).map((value) => ({ value, label: value }));
  }, [sanitizedDataset?.classes]);

  const typeOptions: RadarFilterOption[] = useMemo(() => {
    const types = new Map<string, string>();
    sanitizedDataset?.activities.forEach((activity) => {
      if (activity.type) types.set(activity.type, activity.type);
    });
    return Array.from(types.keys()).map((value) => ({ value, label: value }));
  }, [sanitizedDataset?.activities]);

  const compareLabels = useMemo(() => {
    const labels: Record<string, { label: string; kind: RadarDraggablePayload['kind'] }> = {};
    sanitizedDataset?.students.forEach((student) => {
      labels[student.id] = { label: student.name, kind: 'student' };
    });
    sanitizedDataset?.classes.forEach((cls) => {
      labels[cls.id] = { label: cls.name, kind: 'class' };
    });
    sanitizedDataset?.activities.forEach((activity) => {
      labels[activity.id] = { label: activity.title, kind: 'activity' };
    });
    return labels;
  }, [sanitizedDataset]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    sanitizedDataset?.classes.forEach((cls) => {
      if (cls.year) years.add(cls.year);
    });
    years.add(filters.year);
    return Array.from(years);
  }, [sanitizedDataset?.classes, filters.year]);

  const groupByOptions: RadarFilterOption[] = useMemo(
    () => [
      { value: 'class', label: 'Turma' },
      { value: 'student', label: 'Aluno' },
      { value: 'activity', label: 'Atividade' },
    ],
    []
  );

  const bimesterOptions: RadarFilterOption[] = useMemo(
    () =>
      [1, 2, 3, 4].map((bimester) => ({
        value: String(bimester),
        label: `${bimester}º`,
      })),
    []
  );

  const handleFiltersChange = useCallback((update: Partial<RadarFilters>) => {
    dispatch({ type: 'merge', payload: update });
  }, []);

  const handleCompareSlotDrop = useCallback(
    (slot: RadarCompareSlot, itemId: string) => {
      const next = ensureCompare(filters.compare);
      if (!next[slot].includes(itemId)) {
        next[slot] = [...next[slot], itemId];
        handleFiltersChange({ compare: next });
      }
    },
    [filters.compare, handleFiltersChange]
  );

  const handleCompareSlotRemove = useCallback(
    (slot: RadarCompareSlot, itemId: string) => {
      const next = ensureCompare(filters.compare);
      next[slot] = next[slot].filter((value) => value !== itemId);
      handleFiltersChange({ compare: next });
    },
    [filters.compare, handleFiltersChange]
  );

  const handleCompareClear = useCallback(() => {
    handleFiltersChange({ compare: { A: [], B: [] } });
  }, [handleFiltersChange]);

  const handleRankingSelect = useCallback(
    (payload: RadarDraggablePayload) => {
      if (payload.kind === 'class') {
        handleFiltersChange({ classes: [payload.id], groupBy: 'class' });
      } else if (payload.kind === 'student') {
        handleFiltersChange({ groupBy: 'student' });
      } else if (payload.kind === 'activity') {
        handleFiltersChange({ groupBy: 'activity' });
      }
    },
    [handleFiltersChange]
  );

  const handleRankingCompare = useCallback(
    (payload: RadarDraggablePayload) => {
      const targetSlot: RadarCompareSlot = compare.A.length <= compare.B.length ? 'A' : 'B';
      handleCompareSlotDrop(targetSlot, payload.id);
    },
    [compare.A.length, compare.B.length, handleCompareSlotDrop]
  );

  const accentColor = useMemo(() => {
    if (filters.groupBy !== 'class') return undefined;
    const targetClassId = filters.classes[0] ?? sanitizedDataset?.classes[0]?.id;
    const targetClass = sanitizedDataset?.classes.find((cls) => cls.id === targetClassId);
    return targetClass?.color ?? undefined;
  }, [filters.classes, filters.groupBy, sanitizedDataset?.classes]);

  const sections = useMemo(
    () => [
      {
        id: 'ranking',
        title: 'Ranking',
        content: (
          <Suspense fallback={<LoadingFallback />}>
            <RankingList
              dataset={sanitizedDataset}
              loading={loading}
              groupBy={filters.groupBy}
              onSelect={handleRankingSelect}
              onCompare={handleRankingCompare}
              role={role}
            />
          </Suspense>
        ),
      },
      {
        id: 'scatter',
        title: 'Dispersão',
        content: (
          <Suspense fallback={<LoadingFallback />}>
            <ScatterAvatars
              dataset={sanitizedDataset}
              loading={loading}
              onSelectionChange={(ids) => {
                if (ids.length) {
                  handleFiltersChange({ groupBy: 'student' });
                }
              }}
              groupBy={filters.groupBy}
              role={role}
            />
          </Suspense>
        ),
      },
      {
        id: 'timeline',
        title: 'Linha do tempo',
        content: (
          <Suspense fallback={<LoadingFallback />}>
            <TimelineBrush
              dataset={sanitizedDataset}
              loading={loading}
              onRangeChange={() => {
                /* placeholder cross-filter */
              }}
            />
          </Suspense>
        ),
      },
      {
        id: 'distribution',
        title: 'Distribuição',
        content: (
          <Suspense fallback={<LoadingFallback />}>
            <DistributionChart
              dataset={sanitizedDataset}
              loading={loading}
              groupBy={filters.groupBy}
              onHighlight={() => {
                /* placeholder cross-filter */
              }}
            />
          </Suspense>
        ),
      },
    ],
    [filters.groupBy, handleFiltersChange, handleRankingCompare, handleRankingSelect, loading, role, sanitizedDataset]
  );

  return (
    <DashboardCard
      title="Radar"
      className="h-auto lg:h-[640px]"
      contentClassName="flex h-full flex-col gap-4 overflow-hidden"
    >
      <RadarFiltersBar
        filters={filters}
        availableYears={availableYears}
        classOptions={classOptions}
        bimesterOptions={bimesterOptions}
        subjectOptions={subjectOptions}
        typeOptions={typeOptions}
        groupByOptions={groupByOptions}
        compareLabels={compareLabels}
        onFiltersChange={handleFiltersChange}
        onCompareSlotDrop={handleCompareSlotDrop}
        onCompareSlotRemove={handleCompareSlotRemove}
        onCompareClear={handleCompareClear}
        role={role}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700" role="alert">
            {error}
          </div>
        )}
        <Suspense fallback={<LoadingFallback />}>
          <RadarKpisRow loading={loading} kpis={sanitizedDataset?.kpis ?? null} groupBy={filters.groupBy} accentColor={accentColor} />
        </Suspense>

        <div className="flex-1 overflow-y-auto pr-1">
          {isMobile ? (
            <div className="flex flex-col gap-3">
              {sections.map((section) => (
                <div key={section.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                    onClick={() => setOpenPanel((prev) => (prev === section.id ? '' : section.id))}
                    aria-expanded={openPanel === section.id}
                    aria-controls={`radar-section-${section.id}`}
                  >
                    {section.title}
                    <span className="text-xs text-slate-400">{openPanel === section.id ? '−' : '+'}</span>
                  </button>
                  {openPanel === section.id && <div id={`radar-section-${section.id}`} className="px-4 pb-4">{section.content}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-4">{sections[0]?.content}</div>
              <div className="lg:col-span-4">{sections[1]?.content}</div>
              <div className="lg:col-span-4">{sections[2]?.content}</div>
              <div className="lg:col-span-12">{sections[3]?.content}</div>
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Suspense fallback={<LoadingFallback />}>
                <ApprovalDonut
                  dataset={sanitizedDataset}
                  loading={loading}
                  onSelectStatus={(status) => {
                    if (status === 'risk') {
                      handleFiltersChange({ groupBy: 'student' });
                    }
                  }}
                />
              </Suspense>
            </div>
            <div className="lg:col-span-8">
              <Suspense fallback={<LoadingFallback />}>
                <TopScoresTable
                  dataset={sanitizedDataset}
                  loading={loading}
                  onFilterChange={() => {
                    /* placeholder cross-filter */
                  }}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
