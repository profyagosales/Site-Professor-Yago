import { useMemo } from 'react';
import type { RadarFilters, RadarCompareSlot } from '@/types/radar';
import { classColor } from '@/utils/classColor';
import { RADAR_ITEM_MIME, readRadarDragData, type RadarDraggablePayload } from './dragAndDrop';

export type RadarFilterOption = {
  value: string;
  label: string;
  color?: string | null;
};

type CompareMap = Record<string, { label: string; kind: RadarDraggablePayload['kind'] } | undefined>;

interface RadarFiltersBarProps {
  filters: RadarFilters;
  availableYears: number[];
  classOptions: RadarFilterOption[];
  bimesterOptions: RadarFilterOption[];
  subjectOptions: RadarFilterOption[];
  typeOptions: RadarFilterOption[];
  groupByOptions: RadarFilterOption[];
  compareLabels: CompareMap;
  onFiltersChange: (update: Partial<RadarFilters>) => void;
  onCompareSlotDrop: (slot: RadarCompareSlot, itemId: string) => void;
  onCompareSlotRemove: (slot: RadarCompareSlot, itemId: string) => void;
  onCompareClear?: () => void;
  role?: string;
}

function Chip({
  label,
  active,
  onClick,
  color,
  ariaLabel,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string | null;
  ariaLabel?: string;
}) {
  const palette = useMemo(() => classColor(color ?? label), [color, label]);
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
        active
          ? 'border-transparent text-white'
          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
      }`}
      style={active ? { backgroundColor: palette.bg, color: palette.fg } : undefined}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
    >
      {label}
    </button>
  );
}

function CompareSlot({
  slot,
  values,
  compareLabels,
  onRemove,
  onDrop,
}: {
  slot: RadarCompareSlot;
  values: string[];
  compareLabels: CompareMap;
  onRemove: (slot: RadarCompareSlot, id: string) => void;
  onDrop: (slot: RadarCompareSlot, payload: RadarDraggablePayload) => void;
}) {
  return (
    <div
      className="flex min-h-[64px] flex-1 flex-col gap-2 rounded-xl border border-dashed border-slate-300 p-3 transition-colors focus-within:border-slate-400"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(RADAR_ITEM_MIME)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const payload = readRadarDragData(event);
        if (payload) {
          onDrop(slot, payload);
        }
      }}
      role="list"
      aria-label={`Comparar bloco ${slot}`}
      tabIndex={0}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grupo {slot}</span>
      {values.length === 0 ? (
        <span className="text-xs text-slate-400">Arraste itens para comparar</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {values.map((id) => {
            const info = compareLabels[id];
            const label = info?.label ?? id;
            return (
              <button
                key={id}
                type="button"
                className="group inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                onClick={() => onRemove(slot, id)}
              >
                <span>{label}</span>
                <span className="rounded-full bg-slate-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {info?.kind ?? 'item'}
                </span>
                <span className="text-slate-500">×</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RadarFiltersBar({
  filters,
  availableYears,
  classOptions,
  bimesterOptions,
  subjectOptions,
  typeOptions,
  groupByOptions,
  compareLabels,
  onFiltersChange,
  onCompareSlotDrop,
  onCompareSlotRemove,
  onCompareClear,
  role,
}: RadarFiltersBarProps) {
  const compare = filters.compare ?? { A: [], B: [] };

  const yearOptions = useMemo(() => {
    const next = Array.from(new Set([...availableYears, filters.year])).filter((year) => Number.isFinite(year));
    next.sort((a, b) => b - a);
    return next;
  }, [availableYears, filters.year]);

  const handleToggleMulti = (field: 'classes' | 'bimesters', value: string) => {
    if (field === 'bimesters') {
      const numeric = Number(value);
      const current = new Set(filters.bimesters);
      if (current.has(numeric)) {
        current.delete(numeric);
      } else {
        current.add(numeric);
      }
      onFiltersChange({ bimesters: Array.from(current).sort((a, b) => a - b) });
    } else {
      const current = new Set(filters.classes);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      onFiltersChange({ classes: Array.from(current) });
    }
  };

  const handleSubject = (option?: RadarFilterOption) => {
    onFiltersChange({ subject: option?.value });
  };

  const handleType = (option?: RadarFilterOption) => {
    onFiltersChange({ type: option?.value });
  };

  const handleGroupBy = (option: RadarFilterOption) => {
    onFiltersChange({ groupBy: option.value as RadarFilters['groupBy'] });
  };

  const renderOptions = (options: RadarFilterOption[], selected: string | undefined, onSelect: (option: RadarFilterOption) => void) => (
    <div className="flex flex-wrap gap-2" role="list">
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          color={option.color}
          active={option.value === selected}
          onClick={() => onSelect(option)}
          ariaLabel={option.label}
        />
      ))}
    </div>
  );

  return (
    <div
      className="sticky top-0 z-10 flex flex-col gap-4 bg-white/80 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/60"
      aria-label="Filtros do radar"
    >
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtro por ano">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ano</span>
        {yearOptions.map((year) => (
          <Chip
            key={year}
            label={String(year)}
            active={filters.year === year}
            onClick={() => onFiltersChange({ year })}
            ariaLabel={`Ano ${year}`}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3" role="group" aria-label="Filtro por turma">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Turmas</span>
          {filters.classes.length > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              onClick={() => onFiltersChange({ classes: [] })}
            >
              Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="list">
          {classOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={filters.classes.includes(option.value)}
              onClick={() => handleToggleMulti('classes', option.value)}
              color={option.color}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3" role="group" aria-label="Filtro por bimestre">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bimestres</span>
          {filters.bimesters.length > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              onClick={() => onFiltersChange({ bimesters: [] })}
            >
              Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="list">
          {bimesterOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={filters.bimesters.includes(Number(option.value))}
              onClick={() => handleToggleMulti('bimesters', option.value)}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-2" aria-label="Filtro por matéria" role="group">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matéria</span>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="Todas"
              active={!filters.subject}
              onClick={() => handleSubject(undefined)}
            />
            {subjectOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                active={filters.subject === option.value}
                onClick={() => handleSubject(option)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2" aria-label="Filtro por tipo" role="group">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</span>
          <div className="flex flex-wrap gap-2">
            <Chip label="Todos" active={!filters.type} onClick={() => handleType(undefined)} />
            {typeOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                active={filters.type === option.value}
                onClick={() => handleType(option)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2" aria-label="Agrupar por" role="group">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Agrupar por</span>
          {renderOptions(groupByOptions, filters.groupBy, handleGroupBy)}
        </div>
      </div>

      <div className="flex flex-col gap-2" aria-label="Comparar grupos" role="region">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comparar</span>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {role === 'student' && <span>Arraste itens para comparar com você de forma anônima.</span>}
            {onCompareClear && (
              <button
                type="button"
                className="font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                onClick={onCompareClear}
              >
                Limpar comparação
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <CompareSlot
            slot="A"
            values={compare.A ?? []}
            compareLabels={compareLabels}
            onRemove={onCompareSlotRemove}
            onDrop={(slotId, payload) => onCompareSlotDrop(slotId, payload.id)}
          />
          <CompareSlot
            slot="B"
            values={compare.B ?? []}
            compareLabels={compareLabels}
            onRemove={onCompareSlotRemove}
            onDrop={(slotId, payload) => onCompareSlotDrop(slotId, payload.id)}
          />
        </div>
      </div>
    </div>
  );
}
