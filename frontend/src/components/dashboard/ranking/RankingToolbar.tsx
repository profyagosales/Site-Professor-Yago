import { entityMap, metricMap, type RadarEntityLabel, type RadarMetricLabel } from '@/features/radar/maps';
import type { RankingEntity, RankingMetric, RankingTerm } from '@/types/analytics';

const TERM_OPTIONS: RankingTerm[] = [1, 2, 3, 4];

const ENTITY_TABS: Array<{ id: RankingEntity; label: RadarEntityLabel }> = (
  Object.entries(entityMap) as Array<[RadarEntityLabel, RankingEntity]>
).map(([label, id]) => ({ id, label }));

const METRIC_OPTIONS: Array<{ id: RankingMetric; label: RadarMetricLabel }> = (
  Object.entries(metricMap) as Array<[RadarMetricLabel, RankingMetric]>
).map(([label, id]) => ({ id, label }));

export interface RankingToolbarProps {
  term: RankingTerm;
  metric: RankingMetric;
  entity: RankingEntity;
  classId?: string | null;
  classOptions: Array<{ value: string; label: string }>;
  classOptionsLoading?: boolean;
  onTermChange(term: RankingTerm): void;
  onMetricChange(metric: RankingMetric): void;
  onEntityChange(entity: RankingEntity): void;
  onClassChange(classId: string | null): void;
}

export default function RankingToolbar({
  term,
  metric,
  entity,
  classId,
  classOptions,
  classOptionsLoading = false,
  onTermChange,
  onMetricChange,
  onEntityChange,
  onClassChange,
}: RankingToolbarProps) {
  const showClassFilter = entity !== 'class' && classOptions.length > 0;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
          {TERM_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-full px-3 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 ${
                term === option
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => onTermChange(option)}
            >
              {option}º bim.
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
          {ENTITY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-full px-3 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 ${
                entity === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => onEntityChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Métrica
          <select
            className="min-w-[220px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
            value={metric}
            onChange={(event) => onMetricChange(event.target.value as RankingMetric)}
          >
            {METRIC_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {showClassFilter && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Turma
            <select
              className="min-w-[180px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:cursor-not-allowed disabled:text-slate-400"
              value={classId ?? ''}
              onChange={(event) => onClassChange(event.target.value || null)}
              disabled={classOptionsLoading}
            >
              <option value="">Todas as turmas</option>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

export function metricLabel(metric: RankingMetric): string {
  const option = METRIC_OPTIONS.find((item) => item.id === metric);
  return option?.label ?? metric;
}

export function entityLabel(entity: RankingEntity): string {
  const option = ENTITY_TABS.find((item) => item.id === entity);
  return option?.label ?? entity;
}
