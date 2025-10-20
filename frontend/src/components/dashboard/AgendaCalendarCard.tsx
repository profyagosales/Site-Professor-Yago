import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { toast } from 'react-toastify';
import { FiBookOpen, FiCalendar, FiClock, FiFlag, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import {
  deleteAgendaItem,
  listAgenda,
  type AgendaItemType,
  type AgendaListItem,
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
const TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

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

const FILTER_OPTIONS = Object.keys(FILTER_LABELS) as FilterOption[];

const TYPE_TO_DOT_CLASS: Record<AgendaItemType, string> = {
  ATIVIDADE: 'bg-trabalho',
  CONTEUDO: 'bg-conteudo',
  DATA: 'bg-data',
};

const TYPE_ICON_MAP: Record<AgendaItemType, JSX.Element> = {
  ATIVIDADE: <FiFlag className="h-4 w-4 text-trabalho" />,
  CONTEUDO: <FiBookOpen className="h-4 w-4 text-conteudo" />,
  DATA: <FiCalendar className="h-4 w-4 text-data" />,
};

type FilterOption = 'ALL' | AgendaItemType;
type ViewMode = 'month' | 'week';

type AgendaCalendarCardProps = {
  className?: string;
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

type PopoverState = {
  dayKey: string;
  top: number;
  left: number;
};

const EMPTY_ARRAY: AgendaListItem[] = [];

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

function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return TIME_FORMATTER.format(date);
  } catch {
    return null;
  }
}

function getWeekdayLabel(day: CalendarDay) {
  return WEEKDAY_FORMATTER.format(day.date).replace('.', '');
}

const CalendarGrid = memo(function CalendarGrid({
  viewMode,
  calendarWeeks,
  weekDays,
  itemsByDate,
  registerDayNode,
  onDayClick,
  selectedDayKey,
  editorLoading,
  todayKey,
}: {
  viewMode: ViewMode;
  calendarWeeks: CalendarDay[][];
  weekDays: CalendarDay[];
  itemsByDate: Map<string, AgendaListItem[]>;
  registerDayNode: (key: string, node: HTMLDivElement | null) => void;
  onDayClick: (day: CalendarDay) => void;
  selectedDayKey: string | null;
  editorLoading: boolean;
  todayKey: string;
}) {
  if (viewMode === 'month') {
    return (
      <div className="grid grid-cols-7 grid-rows-6 gap-3">
        {calendarWeeks.map((week) =>
          week.map((day) => (
            <CalendarDayTile
              key={day.key}
              day={day}
              events={itemsByDate.get(day.key) ?? EMPTY_ARRAY}
              registerDayNode={registerDayNode}
              onDayClick={onDayClick}
              selectedDayKey={selectedDayKey}
              editorLoading={editorLoading}
              isToday={day.key === todayKey}
              dimmed={!day.isCurrentMonth}
            />
          )),
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col auto-cols-[minmax(140px,1fr)] gap-3 lg:auto-cols-auto lg:grid-cols-7">
        {weekDays.map((day) => (
          <CalendarDayTile
            key={day.key}
            day={day}
            events={itemsByDate.get(day.key) ?? EMPTY_ARRAY}
            registerDayNode={registerDayNode}
            onDayClick={onDayClick}
            selectedDayKey={selectedDayKey}
            editorLoading={editorLoading}
            isToday={day.key === todayKey}
            dimmed={!day.isWithinYear}
            horizontal
          />
        ))}
      </div>
    </div>
  );
});

const CalendarDayTile = memo(function CalendarDayTile({
  day,
  events,
  registerDayNode,
  onDayClick,
  selectedDayKey,
  editorLoading,
  isToday,
  dimmed,
  horizontal = false,
}: {
  day: CalendarDay;
  events: AgendaListItem[];
  registerDayNode: (key: string, node: HTMLDivElement | null) => void;
  onDayClick: (day: CalendarDay) => void;
  selectedDayKey: string | null;
  editorLoading: boolean;
  isToday: boolean;
  dimmed: boolean;
  horizontal?: boolean;
}) {
  const refCallback = useCallback(
    (node: HTMLDivElement | null) => {
      registerDayNode(day.key, node);
    },
    [day.key, registerDayNode],
  );

  const weekday = getWeekdayLabel(day).toUpperCase();
  const dayNumber = DAY_FORMATTER.format(day.date);
  const hasEvents = events.length > 0;
  const disabled = !day.isWithinYear || editorLoading;
  const isSelected = selectedDayKey === day.key;

  return (
    <div
      ref={refCallback}
      className={[
        'flex h-24 flex-col rounded-2xl border border-slate-200 bg-white p-2 text-left transition-colors duration-150 md:h-28 lg:h-32 xl:h-36',
        'hover:border-slate-300',
        horizontal ? 'snap-start min-w-[140px]' : '',
        dimmed ? 'opacity-60' : '',
        isSelected ? 'ring-2 ring-slate-400' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDayClick(day)}
        className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-left text-[11px] font-medium text-slate-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {weekday}
        </span>
        <span
          className={[
            'inline-flex min-w-[2.25rem] justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
            isToday ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600',
          ].join(' ')}
        >
          {dayNumber}
        </span>
      </button>
      <div className="mt-2 flex-1 space-y-1 overflow-auto">
        {hasEvents
          ? events.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
              >
                <span className={`h-2 w-2 rounded-full ${TYPE_TO_DOT_CLASS[item.type]}`} />
                <span className="line-clamp-2 leading-snug">{item.title}</span>
              </div>
            ))
          : null}
      </div>
    </div>
  );
});

CalendarDayTile.displayName = 'CalendarDayTile';
CalendarGrid.displayName = 'CalendarGrid';

function EmptyStateCompact({ onAdd, disabled = false }: { onAdd: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2">
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Sem itens no período.
      </p>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + Adicionar
      </button>
    </div>
  );
}

function useOutsideClick(ref: React.RefObject<HTMLDivElement>, handler: () => void) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current) return;
      if (event.target instanceof Node && ref.current.contains(event.target)) {
        return;
      }
      handler();
    }

    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('mousedown', handleClick);
    };
  }, [handler, ref]);
}

export default function AgendaCalendarCard({
  className = '',
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
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const dayNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const todayKey = useMemo(() => toDateKey(setUtcMidnight(new Date())), []);

  const cardClassName = [
    'w-full max-w-none rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]',
    'p-6 h-[540px] md:h-[560px] xl:h-[600px] flex flex-col',
    className,
  ]
    .filter(Boolean)
    .join(' ');

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

  const registerDayNode = useCallback((key: string, node: HTMLDivElement | null) => {
    if (!node) {
      dayNodeMap.current.delete(key);
      return;
    }
    dayNodeMap.current.set(key, node);
  }, []);

  const closePopover = useCallback(() => {
    setPopover(null);
  }, []);

  useOutsideClick(popoverRef, closePopover);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenEditor?.();
      }
      if (event.key === 'Escape') {
        closePopover();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [closePopover, onOpenEditor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (popover) {
        closePopover();
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [closePopover, popover]);

  const handleToggleView = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      setPopover(null);
      setCurrentDate((prev) => (mode === 'month' ? startOfMonthUtc(prev) : startOfWeekUtc(prev)));
    },
    [],
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
    setPopover(null);
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
    setPopover(null);
  }, [viewMode]);

  const handleNavKey = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft' && canGoPrev) {
        event.preventDefault();
        handlePrevPeriod();
      } else if (event.key === 'ArrowRight' && canGoNext) {
        event.preventDefault();
        handleNextPeriod();
      }
    },
    [canGoNext, canGoPrev, handleNextPeriod, handlePrevPeriod],
  );

  const handleDayClick = useCallback(
    (day: CalendarDay) => {
      if (!day.isWithinYear) {
        return;
      }
      const node = dayNodeMap.current.get(day.key);
      const container = containerRef.current;
      if (!node || !container) {
        onOpenEditor?.({ presetDate: day.key });
        return;
      }

      if (popover?.dayKey === day.key) {
        setPopover(null);
        return;
      }

      const nodeRect = node.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const top = nodeRect.top - containerRect.top + container.scrollTop + nodeRect.height + 12;
      const left = nodeRect.left - containerRect.left + container.scrollLeft + nodeRect.width / 2;
      setPopover({ dayKey: day.key, top, left });
    },
    [onOpenEditor, popover?.dayKey],
  );

  const handleItemClick = useCallback(
    (item: AgendaListItem) => {
      onOpenEditor?.({ focusId: item.id });
      closePopover();
    },
    [closePopover, onOpenEditor],
  );

  const handleDeleteItem = useCallback(
    async (item: AgendaListItem) => {
      if (deletingId) return;
      try {
        setDeletingId(item.id);
        await deleteAgendaItem(item.id);
        setItems((prev) => prev.filter((entry) => entry.id !== item.id));
        toast.success('Item removido da agenda.');
        closePopover();
      } catch (error) {
        console.error('[AgendaCalendarCard] Falha ao excluir item', error);
        toast.error('Não foi possível excluir o item.');
      } finally {
        setDeletingId(null);
      }
    },
    [closePopover, deletingId],
  );

  const handleQuickAdd = useCallback(() => {
    const candidate = clampToYear(period.fetchStart);
    onOpenEditor?.({ presetDate: toDateKey(candidate) });
  }, [onOpenEditor, period.fetchStart]);

  const popoverItems = popover ? itemsByDate.get(popover.dayKey) ?? EMPTY_ARRAY : EMPTY_ARRAY;
  const isEmpty = !loading && visibleItemCount === 0;

  return (
    <section className={cardClassName}>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-slate-900">Agenda</h2>
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Todos</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              {(['month', 'week'] as ViewMode[]).map((mode) => {
                const active = viewMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleToggleView(mode)}
                    className={[
                      'px-3 py-1 text-xs rounded-full transition',
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:bg-white',
                    ].join(' ')}
                    aria-pressed={active}
                  >
                    {mode === 'month' ? 'MÊS' : 'SEMANA'}
                  </button>
                );
              })}
            </div>
            <div className="hidden items-center gap-1 xl:flex">
              {FILTER_OPTIONS.map((option) => {
                const active = activeFilter === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setActiveFilter(option);
                      setPopover(null);
                    }}
                    className={[
                      'rounded-full border px-3 py-1 text-xs font-medium transition',
                      active
                        ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
                        : 'border-transparent text-slate-600 hover:bg-white',
                    ].join(' ')}
                    aria-pressed={active}
                  >
                    {FILTER_LABELS[option]}
                  </button>
                );
              })}
            </div>
            <div
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600"
              role="group"
              tabIndex={0}
              onKeyDown={handleNavKey}
            >
              <button
                type="button"
                onClick={handlePrevPeriod}
                disabled={!canGoPrev || loading}
                aria-label={viewMode === 'month' ? 'Mês anterior' : 'Semana anterior'}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ‹
              </button>
              <span className="min-w-[140px] text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {period.label}
              </span>
              <button
                type="button"
                onClick={handleNextPeriod}
                disabled={!canGoNext || loading}
                aria-label={viewMode === 'month' ? 'Próximo mês' : 'Próxima semana'}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ›
              </button>
            </div>
            <button
              type="button"
              onClick={() => onOpenEditor?.()}
              disabled={editorLoading}
              className="h-8 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={editorLoading}
              className="h-8 rounded-xl bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Novo
            </button>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1 xl:hidden">
          {FILTER_OPTIONS.map((option) => {
            const active = activeFilter === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setActiveFilter(option);
                  setPopover(null);
                }}
                className={[
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  active
                    ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
                    : 'border-transparent text-slate-600 hover:bg-white',
                ].join(' ')}
                aria-pressed={active}
              >
                {FILTER_LABELS[option]}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="mt-4 flex-1 min-h-0 overflow-hidden">
        <div
          ref={containerRef}
          className="relative h-full overflow-auto overscroll-contain rounded-2xl border border-slate-100 bg-slate-50/40 p-3"
        >
          <div className="space-y-3">
            {isEmpty && !loading ? (
              <EmptyStateCompact onAdd={handleQuickAdd} disabled={editorLoading} />
            ) : null}

            {loading && hasFetched ? (
              viewMode === 'month' ? (
                <div className="grid grid-cols-7 grid-rows-6 gap-3">
                  {Array.from({ length: 42 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-24 rounded-2xl border border-slate-200 bg-white/70 opacity-80 animate-pulse md:h-28 lg:h-32 xl:h-36"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-flow-col auto-cols-[minmax(140px,1fr)] gap-3 lg:grid-cols-7">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-24 rounded-2xl border border-slate-200 bg-white/70 opacity-80 animate-pulse md:h-28 lg:h-32 xl:h-36"
                    />
                  ))}
                </div>
              )
            ) : (
              <CalendarGrid
                viewMode={viewMode}
                calendarWeeks={calendarWeeks}
                weekDays={weekDays}
                itemsByDate={itemsByDate}
                registerDayNode={(key, node) => {
                  registerDayNode(key, node);
                  if (popover?.dayKey === key && !node) {
                    setPopover(null);
                  }
                }}
                onDayClick={handleDayClick}
                selectedDayKey={popover?.dayKey ?? null}
                editorLoading={editorLoading}
                todayKey={todayKey}
              />
            )}
          </div>

          {popover ? (
            <div
              ref={popoverRef}
              className="pointer-events-auto absolute z-[var(--z-pop)] max-w-[320px] rounded-3xl border border-border bg-surface p-4 shadow-elev"
              style={{
                top: popover.top,
                left: popover.left,
                transform: 'translate(-50%, 0)',
              }}
            >
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-textSoft">
                <FiCalendar className="h-4 w-4 text-data" />
                {popover.dayKey}
              </div>
              {popoverItems.length ? (
                <ul className="flex flex-col gap-3">
                  {popoverItems.map((item) => {
                    const timeLabel = formatTime(item.date);
                    return (
                      <li key={item.id} className="rounded-2xl border border-border bg-surface2 p-3 shadow-soft">
                        <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0 rounded-full bg-surface p-2 shadow-soft">{TYPE_ICON_MAP[item.type]}</div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p
                            className="text-sm font-semibold text-text leading-snug"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {item.title}
                          </p>
                          <p className="text-xs text-textSoft">
                            {item.className ?? 'Turma'}
                            {timeLabel ? (
                              <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted">
                                <FiClock className="h-3 w-3" />
                                {timeLabel}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleItemClick(item)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item)}
                          disabled={deletingId === item.id}
                          className="text-danger"
                        >
                          Excluir
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-sm text-textSoft">Sem itens neste dia.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  </section>
  );
}
