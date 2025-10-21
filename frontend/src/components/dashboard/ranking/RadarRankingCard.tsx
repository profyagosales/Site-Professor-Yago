import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { fetchRankings, createFiltersKey } from '@/services/analytics';
import type {
  RankingsFilters,
  RankingsResponse,
  RankingMetric,
  RankingEntity,
  RankingTerm,
} from '@/types/analytics';
import RankingToolbar, { entityLabel, metricLabel } from './RankingToolbar';
import RankingList, { RankingSkeleton } from './RankingList';
import ConfettiBurst from './ConfettiBurst';
import { listMyClasses, type ClassSummary } from '@/services/classes.service';
import { getCurrentUser } from '@/services/auth';

const CONFETTI_FLAG = String((import.meta as any)?.env?.VITE_FEATURE_RANKING_CONFETTI ?? '1') !== '0';
const RANKING_LIMIT = 10;

const INITIAL_FILTERS: RankingsFilters = {
  term: 1,
  entity: 'student',
  metric: 'term_avg',
  classId: null,
};

interface RankingCardState {
  data: RankingsResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: RankingCardState = {
  data: null,
  loading: true,
  error: null,
};

export default function RadarRankingCard() {
  const [filters, setFilters] = useState<RankingsFilters>(INITIAL_FILTERS);
  const [state, setState] = useState<RankingCardState>(initialState);
  const [refreshToken, setRefreshToken] = useState(0);
  const [classOptions, setClassOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const cacheRef = useRef<Map<string, RankingsResponse>>(new Map());
  const pendingMetricRef = useRef<RankingMetric | null>(null);
  const [confettiSeed, setConfettiSeed] = useState<number | null>(null);
  const lastMetricRef = useRef<RankingMetric>(INITIAL_FILTERS.metric);

  useEffect(() => {
    let active = true;
    setClassesLoading(true);
    (async () => {
      try {
        const current = await getCurrentUser().catch(() => null);
        const teacherId = current?.id ?? current?._id ?? null;
        const classes = await listMyClasses({ teacherId });
        if (!active) return;
        setClassOptions(
          classes
            .map((klass) => {
              const value = normalizeClassId(klass);
              if (!value) return null;
              return {
                value,
                label: formatClassLabel(klass),
              };
            })
            .filter(Boolean) as Array<{ value: string; label: string }>,
        );
      } catch (error) {
        if (active) {
          console.error('[RadarRankingCard] Falha ao carregar turmas', error);
        }
      } finally {
        if (active) {
          setClassesLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!filters.classId) return;
    const exists = classOptions.some((option) => option.value === filters.classId);
    if (!exists) {
      setFilters((prev) => ({ ...prev, classId: null }));
    }
  }, [classOptions, filters.classId]);

  useEffect(() => {
    if (filters.metric !== lastMetricRef.current) {
      lastMetricRef.current = filters.metric;
      pendingMetricRef.current = filters.metric;
    }
  }, [filters.metric]);

  useEffect(() => {
    const controller = new AbortController();
    const normalizedFilters: RankingsFilters = {
      ...filters,
      classId: filters.entity === 'class' ? null : filters.classId ?? null,
    };
    const cacheKey = createFiltersKey(normalizedFilters, RANKING_LIMIT);
    const cached = cacheRef.current.get(cacheKey);

    setState((prev) => ({
      data: cached ?? prev.data,
      loading: !cached,
      error: null,
    }));

    const tabLabel = resolveEntityLabel(normalizedFilters.entity);
    const metricLabelName = resolveMetricLabel(normalizedFilters.metric);
    const termChip = `${normalizedFilters.term}º bimestre`;

    fetchRankings({
      tabLabel,
      metricLabel: metricLabelName,
      termChip,
      classId: normalizedFilters.classId ?? undefined,
      signal: controller.signal,
      limit: RANKING_LIMIT,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        cacheRef.current.set(cacheKey, response);
        setState({ data: response, loading: false, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('[RadarRankingCard] Falha ao carregar rankings', error);
        setState((prev) => ({
          data: prev.data,
          loading: false,
          error: 'Não foi possível carregar os rankings.',
        }));
      });

    return () => {
      controller.abort();
    };
  }, [filters, refreshToken]);

  useEffect(() => {
    if (!CONFETTI_FLAG) return;
    if (!state.data) return;
    if (state.loading || state.error) return;
    const pendingMetric = pendingMetricRef.current;
    if (!pendingMetric) return;
    if (state.data.context.metric !== pendingMetric) return;
    const seed = Math.floor(Math.random() * 1_000_000);
    setConfettiSeed(seed);
    pendingMetricRef.current = null;
    const timeout = window.setTimeout(() => setConfettiSeed(null), 900);
    return () => window.clearTimeout(timeout);
  }, [state.data, state.loading, state.error]);

  const title = useMemo(() => {
    return `Top ${RANKING_LIMIT} do ${filters.term}º bimestre — ${entityLabel(filters.entity)}`;
  }, [filters.term, filters.entity]);

  const subtitle = useMemo(() => {
    const context = state.data?.context;
    if (!context) return '';
    const parts: string[] = [];
    const format = (value: number | null | undefined) =>
      typeof value === 'number' && Number.isFinite(value)
        ? value.toLocaleString('pt-BR')
        : null;
    if (context.base_classes) {
      const formatted = format(context.base_classes);
      if (formatted) parts.push(`${formatted} turmas`);
    }
    if (context.base_students) {
      const formatted = format(context.base_students);
      if (formatted) parts.push(`${formatted} alunos`);
    }
    if (context.base_activities) {
      const formatted = format(context.base_activities);
      if (formatted) parts.push(`${formatted} atividades`);
    }
    return parts.length ? `Base: ${parts.join(' · ')}` : '';
  }, [state.data?.context]);

  const items = state.data?.items ?? [];

  const handleTermChange = useCallback((term: RankingTerm) => {
    setFilters((prev) => ({ ...prev, term }));
  }, []);

  const handleMetricChange = useCallback((metric: RankingMetric) => {
    setFilters((prev) => ({ ...prev, metric }));
  }, []);

  const handleEntityChange = useCallback((entity: RankingEntity) => {
    setFilters((prev) => ({
      ...prev,
      entity,
      classId: entity === 'class' ? null : prev.classId ?? null,
    }));
  }, []);

  const handleClassChange = useCallback((classId: string | null) => {
    setFilters((prev) => ({ ...prev, classId }));
  }, []);

  const handleRetry = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);

  return (
    <DashboardCard
      title={title}
      action={subtitle ? <span className="text-xs font-medium text-slate-400">{subtitle}</span> : undefined}
      className="relative overflow-hidden"
      contentClassName="relative flex flex-col gap-6"
    >
      {CONFETTI_FLAG && confettiSeed !== null ? <ConfettiBurst seed={confettiSeed} /> : null}
      <RankingToolbar
        term={filters.term}
        metric={filters.metric}
        entity={filters.entity}
        classId={filters.classId ?? null}
        classOptions={classOptions}
        classOptionsLoading={classesLoading}
        onTermChange={handleTermChange}
        onMetricChange={handleMetricChange}
        onEntityChange={handleEntityChange}
        onClassChange={handleClassChange}
      />

      <div className="relative min-h-[360px]">
        {state.loading && !items.length ? (
          <RankingSkeleton />
        ) : state.error && !items.length ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/80 px-6 py-12 text-center text-sm text-rose-700">
            <p>{state.error}</p>
            <button
              type="button"
              className="mt-4 rounded-full bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              onClick={handleRetry}
            >
              Tentar novamente
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500">
            <p>Sem dados para este recorte.</p>
          </div>
        ) : (
          <RankingList items={items} entity={filters.entity} metric={filters.metric} />
        )}
      </div>

      {state.error && items.length ? (
        <p className="text-xs text-rose-500">Não foi possível atualizar os rankings agora. Exibindo dados em cache.</p>
      ) : null}

      {!state.loading && !state.error && state.data ? (
        <p className="text-xs text-slate-400">
          Métrica selecionada: <span className="font-medium text-slate-500">{metricLabel(state.data.context.metric)}</span>
        </p>
      ) : null}
    </DashboardCard>
  );
}

function normalizeClassId(klass: ClassSummary): string | null {
  if (!klass) return null;
  const raw = (klass as any)?.id ?? (klass as any)?._id;
  if (!raw) return null;
  const value = String(raw).trim();
  return value || null;
}

function formatClassLabel(klass: ClassSummary): string {
  if (!klass) return 'Turma';
  if (klass.name) return klass.name;
  const series = klass.series ? `${klass.series}º` : '';
  const letter = klass.letter ?? '';
  const grade = `${series}${letter}`.trim();
  const subject = klass.discipline ?? klass.subject ?? '';
  if (grade && subject) return `${grade} • ${subject}`;
  return grade || subject || 'Turma';
}
