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
import {
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiFlag,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
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

const TYPE_TO_DOT_CLASS: Record<AgendaItemType, string> = {
  ATIVIDADE: 'bg-orange-400',
  CONTEUDO: 'bg-indigo-400',
  DATA: 'bg-emerald-400',
};

const TYPE_ICON_MAP: Record<AgendaItemType, JSX.Element> = {
  ATIVIDADE: <FiFlag className="h-4 w-4 text-orange-500" />,
  CONTEUDO: <FiBookOpen className="h-4 w-4 text-indigo-500" />,
  DATA: <FiCalendar className="h-4 w-4 text-emerald-500" />,
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
      <div className="grid grid-cols-7 gap-2 pb-6 pr-2 lg:gap-3">
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
    <div className="overflow-x-auto snap-x">
      <div className="grid min-w-max grid-cols-7 gap-2 pb-6 pr-6 snap-mandatory lg:gap-3">
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
  const dots = events.slice(0, 4);
  const overflow = events.length - dots.length;
  const disabled = !day.isWithinYear || editorLoading;
  const isSelected = selectedDayKey === day.key;

  return (
    <div
      ref={refCallback}
      className={[
        'flex min-h-[96px] lg:min-h-[112px] flex-col rounded-2xl border border-black/5 bg-white/70 p-2 text-left transition duration-250',
        'hover:-translate-y-[1px] hover:shadow-md hover:bg-white/90',
        horizontal ? 'snap-start min-w-[140px]' : '',
        dimmed ? 'opacity-60' : '',
        isSelected ? 'ring-2 ring-ys-amber' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDayClick(day)}
        className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-[11px] font-medium text-black/60 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ys-amber disabled:cursor-not-allowed"
      >
        <span className="uppercase tracking-wide">{weekday}</span>
        <span
          className={[
            'ml-auto inline-flex min-w-[2.25rem] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
            isToday ? 'bg-ys-amber text-white' : 'bg-black/5 text-black/70',
          ].join(' ')}
        >
          {dayNumber}
        </span>
      </button>
      {hasEvents ? (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {dots.map((item) => (
            <span
              key={item.id}
              className={`h-2.5 w-2.5 rounded-full ${TYPE_TO_DOT_CLASS[item.type]}`}
              title={item.title}
            />
          ))}
          {overflow > 0 ? (
            <span className="ml-1 text-[11px] font-semibold text-black/50">+{overflow}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

CalendarDayTile.displayName = 'CalendarDayTile';
CalendarGrid.displayName = 'CalendarGrid';

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
    'w-full max-w-none rounded-[22px] border border-black/5 bg-white/80 shadow-ys-md backdrop-blur-sm',
    'flex h-full min-h-[28rem] flex-col',
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-3 px-5 pt-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-slate-900">Agenda</h3>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {(Object.keys(FILTER_LABELS) as FilterOption[]).map((option) => {
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
                    'rounded-full px-3 py-1 text-sm font-medium transition duration-250',
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-black/5 text-black/60 hover:bg-black/10',
                  ].join(' ')}
                  aria-pressed={active}
                >
                  {FILTER_LABELS[option]}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-black/5 px-1 py-1">
            {(['week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleToggleView(mode)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition duration-250',
                  viewMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-black/60 hover:text-slate-900',
                ].join(' ')}
                aria-pressed={viewMode === mode}
              >
                {mode === 'month' ? 'Mês' : 'Semana'}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-sm font-medium text-black/70 shadow-sm"
            role="group"
            tabIndex={0}
            onKeyDown={handleNavKey}
          >
            <button
              type="button"
              onClick={handlePrevPeriod}
              disabled={!canGoPrev || loading}
              aria-label={viewMode === 'month' ? 'Mês anterior' : 'Semana anterior'}
              className="rounded-full px-2 py-1 text-lg leading-none transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </button>
            <span className="whitespace-nowrap px-1 text-sm font-semibold uppercase tracking-wide text-black/70">
              {period.label}
            </span>
            <button
              type="button"
              onClick={handleNextPeriod}
              disabled={!canGoNext || loading}
              aria-label={viewMode === 'month' ? 'Próximo mês' : 'Próxima semana'}
              className="rounded-full px-2 py-1 text-lg leading-none transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenEditor?.()}
            disabled={editorLoading}
            className="inline-flex"
          >
            <FiEdit2 className="h-4 w-4" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleQuickAdd}
            disabled={editorLoading}
            className="inline-flex"
          >
            <FiPlus className="h-4 w-4" />
            <span className="lg:hidden">Adicionar</span>
          </Button>
        </div>
      </header>

      <div ref={containerRef} className="relative h-[540px] flex-1 overflow-auto overscroll-contain px-1">
        <div className="space-y-4 px-4 py-5">
          {loading && hasFetched ? (
            <div className={viewMode === 'month' ? 'grid grid-cols-7 gap-2 lg:gap-3' : 'grid grid-cols-7 gap-2 lg:gap-3'}>
              {Array.from({ length: viewMode === 'month' ? 42 : 7 }).map((_, index) => (
                <div key={index} className="h-24 rounded-2xl bg-black/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {isEmpty ? (
                <div className="text-sm text-black/50 flex items-center gap-2 px-2 py-2">
                  <span role="img" aria-label="Sem itens">
                    🌤️
                  </span>
                  <span>Sem itens no período selecionado.</span>
                </div>
              ) : null}
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
            </>
          )}
        </div>
        {popover ? (
          <div
            ref={popoverRef}
            className="pointer-events-auto absolute z-20 max-w-[320px] rounded-2xl border border-black/5 bg-white/95 p-3 shadow-xl backdrop-blur"
            style={{
              top: popover.top,
              left: popover.left,
              transform: 'translate(-50%, 0)',
            }}
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-black/50">
              <FiCalendar className="h-4 w-4" />
              {popover.dayKey}
            </div>
            {popoverItems.length ? (
              <ul className="flex flex-col gap-3">
                {popoverItems.map((item) => {
                  const timeLabel = formatTime(item.date);
                  return (
                    <li key={item.id} className="rounded-2xl border border-black/5 bg-white/90 p-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0 rounded-full bg-black/5 p-2">{TYPE_ICON_MAP[item.type]}</div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p
                            className="text-sm font-semibold text-slate-900 leading-snug"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {item.title}
                          </p>
                          <p className="text-xs text-black/50">
                            {item.className ?? 'Turma'}
                            {timeLabel ? (
                              <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-black/40">
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
                          <FiEdit2 className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item)}
                          disabled={deletingId === item.id}
                        >
                          <FiTrash2 className="h-4 w-4 text-rose-500" />
                          Excluir
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-sm text-black/50">Sem itens neste dia.</div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
