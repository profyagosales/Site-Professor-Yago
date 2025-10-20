import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import DashboardCard from './DashboardCard';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';
import {
  listAgenda,
  type AgendaListItem,
  type AgendaItemType,
  type AgendaQueryParams,
} from '@/services/agenda';

const YEAR = 2025;
const YEAR_START = new Date(Date.UTC(YEAR, 0, 1));
const YEAR_END = new Date(Date.UTC(YEAR, 11, 31, 23, 59, 59, 999));
const MIN_MONTH_START = new Date(Date.UTC(YEAR, 0, 1));
const MAX_MONTH_START = new Date(Date.UTC(YEAR, 11, 1));
const MIN_WEEK_START = startOfWeekUtc(YEAR_START);
const MAX_WEEK_START = startOfWeekUtc(YEAR_END);

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
const DAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: 'UTC' });
const YEAR_FORMATTER = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', timeZone: 'UTC' });
const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

const FILTER_LABELS: Record<FilterOption, string> = {
  ALL: 'Todos',
  ATIVIDADE: 'Atividades',
  CONTEUDO: 'Conteúdos',
  DATA: 'Datas',
};

const FILTER_TO_QUERY: Record<FilterOption, AgendaQueryParams['tipo']> = {
  ALL: 'all',
  ATIVIDADE: 'atividade',
  CONTEUDO: 'conteudo',
  DATA: 'data',
};

const TYPE_STYLES: Record<AgendaItemType, { pill: string; text: string; hover: string }> = {
  ATIVIDADE: {
    pill: 'bg-orange-500/15 border border-orange-200',
    text: 'text-orange-700',
    hover: 'hover:border-orange-300 hover:bg-orange-500/20',
  },
  CONTEUDO: {
    pill: 'bg-indigo-500/15 border border-indigo-200',
    text: 'text-indigo-700',
    hover: 'hover:border-indigo-300 hover:bg-indigo-500/20',
  },
  DATA: {
    pill: 'bg-emerald-500/15 border border-emerald-200',
    text: 'text-emerald-700',
    hover: 'hover:border-emerald-300 hover:bg-emerald-500/20',
  },
};

type FilterOption = 'ALL' | AgendaItemType;
type ViewMode = 'month' | 'week';

type AgendaCalendarCardProps = {
  className?: string;
  contentClassName?: string;
  refreshToken?: number;
  onOpenEditor?: (options?: { focusId?: string | null; presetDate?: string | null }) => void;
  editorLoading?: boolean;
};

type CalendarDay = {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isWithinYear: boolean;
};

type PeriodContext = {
  fetchStart: Date;
  fetchEnd: Date;
  calendarStart: Date;
  calendarEnd: Date;
  label: string;
};

function setUtcMidnight(date: Date): Date {
  const clone = new Date(date);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function addDaysUtc(date: Date, amount: number): Date {
  const clone = new Date(date);
  clone.setUTCDate(clone.getUTCDate() + amount);
  return clone;
}

function startOfWeekUtc(date: Date): Date {
  const base = setUtcMidnight(date);
  const day = base.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysUtc(base, diff);
}

function endOfWeekUtc(date: Date): Date {
  const start = startOfWeekUtc(date);
  const end = addDaysUtc(start, 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function addMonthsUtc(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function clampToYear(date: Date): Date {
  if (date.getTime() < YEAR_START.getTime()) return new Date(YEAR_START);
  if (date.getTime() > YEAR_END.getTime()) return new Date(YEAR_END);
  return date;
}

function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function normalizeMonthLabel(date: Date): string {
  const month = MONTH_FORMATTER.format(date).replace('.', '').toUpperCase();
  const year = YEAR_FORMATTER.format(date);
  return `${month} ${year}`;
}

function normalizeWeekLabel(start: Date, end: Date): string {
  const startMonth = MONTH_FORMATTER.format(start).replace('.', '').toUpperCase();
  const endMonth = MONTH_FORMATTER.format(end).replace('.', '').toUpperCase();
  const startDay = DAY_FORMATTER.format(start);
  const endDay = DAY_FORMATTER.format(end);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

  if (sameMonth && sameYear) {
    return `${startDay}–${endDay} ${endMonth} ${YEAR_FORMATTER.format(end)}`;
  }

  const startLabel = `${startDay} ${startMonth}`;
  const endLabel = `${endDay} ${endMonth}`;
  return `${startLabel} – ${endLabel} ${YEAR_FORMATTER.format(end)}`;
}

function resolveInitialReferenceDate(): Date {
  const today = new Date();
  const reference = setUtcMidnight(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));
  if (reference.getUTCFullYear() > YEAR) {
    return new Date(Date.UTC(YEAR, 9, 1));
  }
  if (reference.getUTCFullYear() < YEAR) {
    return new Date(Date.UTC(YEAR, 0, 1));
  }
  return clampToYear(reference);
}

export default function AgendaCalendarCard({
  className = '',
  contentClassName = '',
  refreshToken = 0,
  onOpenEditor,
  editorLoading = false,
}: AgendaCalendarCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => startOfMonthUtc(resolveInitialReferenceDate()));
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [items, setItems] = useState<AgendaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const cardClassName = ['flex h-full min-h-[26rem] flex-col', className].filter(Boolean).join(' ');
  const cardContentClassName = ['flex h-full min-h-0 flex-col gap-4', contentClassName].filter(Boolean).join(' ');

  const period = useMemo<PeriodContext>(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonthUtc(currentDate);
      const calendarStart = startOfWeekUtc(monthStart);
      const calendarEnd = endOfWeekUtc(endOfMonthUtc(monthStart));
      const fetchStart = clampToYear(calendarStart);
      const fetchEnd = clampToYear(calendarEnd);
      return {
        fetchStart,
        fetchEnd,
        calendarStart,
        calendarEnd,
        label: normalizeMonthLabel(monthStart),
      } satisfies PeriodContext;
    }

    const weekStart = startOfWeekUtc(currentDate);
    const weekEnd = endOfWeekUtc(currentDate);
    const fetchStart = clampToYear(weekStart);
    const fetchEnd = clampToYear(weekEnd);
    return {
      fetchStart,
      fetchEnd,
      calendarStart: weekStart,
      calendarEnd: weekEnd,
      label: normalizeWeekLabel(weekStart, weekEnd),
    } satisfies PeriodContext;
  }, [currentDate, viewMode]);

  const calendarWeeks = useMemo<CalendarDay[][]>(() => {
    if (viewMode !== 'month') {
      return [];
    }
    const monthStart = startOfMonthUtc(currentDate);
    const firstDay = startOfWeekUtc(monthStart);
    const lastDay = endOfWeekUtc(endOfMonthUtc(monthStart));
    const weeks: CalendarDay[][] = [];
    let cursor = firstDay;
    while (cursor.getTime() <= lastDay.getTime()) {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i += 1) {
        const dayDate = addDaysUtc(cursor, i);
        week.push({
          date: dayDate,
          key: toDateKey(dayDate),
          isCurrentMonth: dayDate.getUTCMonth() === monthStart.getUTCMonth(),
          isWithinYear:
            dayDate.getTime() >= YEAR_START.getTime() && dayDate.getTime() <= YEAR_END.getTime(),
        });
      }
      weeks.push(week);
      cursor = addDaysUtc(cursor, 7);
    }
    return weeks;
  }, [currentDate, viewMode]);

  const weekDays = useMemo<CalendarDay[]>(() => {
    if (viewMode !== 'week') {
      return [];
    }
    const start = startOfWeekUtc(currentDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDaysUtc(start, index);
      return {
        date,
        key: toDateKey(date),
        isCurrentMonth: true,
        isWithinYear: date.getTime() >= YEAR_START.getTime() && date.getTime() <= YEAR_END.getTime(),
      } satisfies CalendarDay;
    });
  }, [currentDate, viewMode]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, AgendaListItem[]>();
    items.forEach((item) => {
      const key = typeof item.date === 'string' ? item.date.slice(0, 10) : '';
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    map.forEach((list) => {
      list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }));
    });

    return map;
  }, [items]);

  const visibleItemCount = useMemo(() => {
    if (viewMode === 'month') {
      return calendarWeeks.reduce((total, week) => {
        return (
          total +
          week.reduce((subtotal, day) => subtotal + (itemsByDate.get(day.key)?.length ?? 0), 0)
        );
      }, 0);
    }
    return weekDays.reduce((total, day) => total + (itemsByDate.get(day.key)?.length ?? 0), 0);
  }, [calendarWeeks, itemsByDate, viewMode, weekDays]);

  const canGoPrev = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonthUtc(currentDate);
      return monthStart.getTime() > MIN_MONTH_START.getTime();
    }
    const weekStart = startOfWeekUtc(currentDate);
    return weekStart.getTime() > MIN_WEEK_START.getTime();
  }, [currentDate, viewMode]);

  const canGoNext = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonthUtc(currentDate);
      return monthStart.getTime() < MAX_MONTH_START.getTime();
    }
    const weekStart = startOfWeekUtc(currentDate);
    return weekStart.getTime() < MAX_WEEK_START.getTime();
  }, [currentDate, viewMode]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHasFetched(true);

    const query: AgendaQueryParams = {
      from: toDateKey(period.fetchStart),
      to: toDateKey(period.fetchEnd),
      tipo: FILTER_TO_QUERY[activeFilter],
    };

    listAgenda(query)
      .then((response) => {
        if (cancelled) return;
        setItems(response);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[AgendaCalendarCard] Falha ao carregar agenda', error);
        toast.error('Não foi possível carregar a agenda.');
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeFilter, period.fetchEnd, period.fetchStart, refreshToken]);

  const handleToggleView = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      setCurrentDate((prev) => (mode === 'month' ? startOfMonthUtc(prev) : startOfWeekUtc(prev)));
    },
    []
  );

  const handlePrevPeriod = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'month') {
        const monthStart = startOfMonthUtc(prev);
        const next = addMonthsUtc(monthStart, -1);
        return next.getTime() < MIN_MONTH_START.getTime() ? new Date(MIN_MONTH_START) : next;
      }
      const weekStart = startOfWeekUtc(prev);
      const next = addDaysUtc(weekStart, -7);
      return next.getTime() < MIN_WEEK_START.getTime() ? new Date(MIN_WEEK_START) : next;
    });
  }, [viewMode]);

  const handleNextPeriod = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'month') {
        const monthStart = startOfMonthUtc(prev);
        const next = addMonthsUtc(monthStart, 1);
        return next.getTime() > MAX_MONTH_START.getTime() ? new Date(MAX_MONTH_START) : next;
      }
      const weekStart = startOfWeekUtc(prev);
      const next = addDaysUtc(weekStart, 7);
      return next.getTime() > MAX_WEEK_START.getTime() ? new Date(MAX_WEEK_START) : next;
    });
  }, [viewMode]);

  const handleNavKey = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft' && canGoPrev) {
        event.preventDefault();
        handlePrevPeriod();
      } else if (event.key === 'ArrowRight' && canGoNext) {
        event.preventDefault();
        handleNextPeriod();
      }
    },
    [canGoNext, canGoPrev, handleNextPeriod, handlePrevPeriod]
  );

  const handleDayClick = useCallback(
    (day: CalendarDay) => {
      if (!day.isWithinYear) {
        return;
      }
      onOpenEditor?.({ presetDate: day.key });
    },
    [onOpenEditor]
  );

  const handleItemClick = useCallback(
    (item: AgendaListItem) => {
      onOpenEditor?.({ focusId: item.id });
    },
    [onOpenEditor]
  );

  const handleEmptyAdd = useCallback(() => {
    const candidate = clampToYear(period.fetchStart);
    onOpenEditor?.({ presetDate: toDateKey(candidate) });
  }, [onOpenEditor, period.fetchStart]);

  const renderDayHeader = (day: CalendarDay) => {
    const weekdayLabel = WEEKDAY_FORMATTER.format(day.date).replace('.', '');
    const dayLabel = DAY_FORMATTER.format(day.date);
    const monthLabel = MONTH_FORMATTER.format(day.date).replace('.', '');
    const yearLabel = YEAR_FORMATTER.format(day.date);
    return (
      <button
        type="button"
        onClick={() => handleDayClick(day)}
        disabled={!day.isWithinYear || editorLoading}
        aria-label={`Adicionar item em ${dayLabel} ${monthLabel} ${yearLabel}`}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
          day.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
        } ${day.isWithinYear ? 'bg-white hover:bg-slate-50' : 'bg-slate-100 cursor-not-allowed opacity-50'}`}
      >
        <span className="uppercase">{weekdayLabel}</span>
        <span>{dayLabel}</span>
      </button>
    );
  };

  const renderPills = (dayKey: string) => {
    const entries = itemsByDate.get(dayKey) ?? [];
    if (!entries.length) {
      return null;
    }
    return (
      <div className="mt-2 flex flex-col gap-1">
        {entries.map((item) => {
          const style = TYPE_STYLES[item.type];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              disabled={editorLoading}
              className={`flex items-center justify-between rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                style.pill
              } ${style.text} ${style.hover}`}
            >
              <span className="truncate text-left">{item.title}</span>
              <span className="ml-2 text-[0.65rem] uppercase tracking-wide text-slate-500">{FILTER_LABELS[item.type]}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardCard
      title="Agenda"
      className={cardClassName}
      contentClassName={cardContentClassName}
      action={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold shadow-sm">
            {(['month', 'week'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleToggleView(mode)}
                className={`rounded-full px-3 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                  viewMode === mode ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-slate-500'
                }`}
                aria-pressed={viewMode === mode}
              >
                {mode === 'month' ? 'Mês' : 'Semana'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as FilterOption[]).map((option) => {
              const active = activeFilter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setActiveFilter(option)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-pressed={active}
                >
                  {FILTER_LABELS[option]}
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            tabIndex={0}
            role="group"
            onKeyDown={handleNavKey}
          >
            <button
              type="button"
              onClick={handlePrevPeriod}
              disabled={!canGoPrev || loading}
              aria-label={viewMode === 'month' ? 'Mês anterior' : 'Semana anterior'}
              className="rounded-full border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ‹
            </button>
            <span className="min-w-[8rem] text-center text-sm font-semibold text-slate-700 uppercase tracking-wide">
              {period.label}
            </span>
            <button
              type="button"
              onClick={handleNextPeriod}
              disabled={!canGoNext || loading}
              aria-label={viewMode === 'month' ? 'Próximo mês' : 'Próxima semana'}
              className="rounded-full border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ›
            </button>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenEditor?.()}
            disabled={editorLoading}
          >
            Editar
          </Button>
        </div>
      }
    >
      {loading && hasFetched ? (
        <div className={`grid gap-2 ${viewMode === 'month' ? 'grid-cols-7' : 'grid-cols-7'}`}>
          {Array.from({ length: viewMode === 'month' ? 42 : 7 }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          {viewMode === 'month' ? (
            <div className="grid grid-cols-7 gap-3">
              {calendarWeeks.map((week) =>
                week.map((day) => (
                  <div key={day.key} className="flex min-h-[7.5rem] flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    {renderDayHeader(day)}
                    <div className="flex-1 overflow-hidden">
                      {renderPills(day.key) ?? (
                        <p className="mt-2 text-xs text-slate-400">Sem itens</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map((day) => (
                <div key={day.key} className="flex min-h-[8rem] flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  {renderDayHeader(day)}
                  <div className="flex-1 overflow-hidden">
                    {renderPills(day.key) ?? (
                      <p className="mt-2 text-xs text-slate-400">Sem itens</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && visibleItemCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
          <p className="text-sm text-slate-500">Nenhum item neste período.</p>
          <Button type="button" size="sm" onClick={handleEmptyAdd} disabled={editorLoading}>
            Adicionar item
          </Button>
        </div>
      ) : null}
    </DashboardCard>
  );
}
