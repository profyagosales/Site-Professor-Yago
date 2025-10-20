import * as Popover from '@radix-ui/react-popover';
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

const POPOVER_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
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

type FilterOption = 'ALL' | AgendaItemType;
type ViewMode = 'mes' | 'semana';

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

const EMPTY_ARRAY: AgendaListItem[] = [];

function mapTypeStroke(type: AgendaItemType) {
  switch (type) {
    case 'ATIVIDADE':
      return 'var(--agenda-atividades)';
    case 'CONTEUDO':
      return 'var(--agenda-conteudos)';
    case 'DATA':
    default:
      return 'var(--agenda-datas)';
  }
}

function mapTypeBg(type: AgendaItemType) {
  switch (type) {
    case 'ATIVIDADE':
      return 'var(--agenda-atividades-bg)';
    case 'CONTEUDO':
      return 'var(--agenda-conteudos-bg)';
    case 'DATA':
    default:
      return 'var(--agenda-datas-bg)';
  }
}

function mapTypeText(type: AgendaItemType) {
  switch (type) {
    case 'ATIVIDADE':
      return '#7a3e19';
    case 'CONTEUDO':
      return '#332b7a';
    case 'DATA':
    default:
      return '#135e56';
  }
}

function formatPopoverDate(value: string) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const weekday = POPOVER_DATE_FORMATTER.format(date).replace('.', '').toUpperCase();
    const timeLabel = TIME_FORMATTER.format(date);
    return `${weekday} • ${timeLabel}`;
  } catch {
    return '';
  }
}

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

function resolveInitialDateForView(mode: ViewMode): Date {
  const today = setUtcMidnight(new Date());
  const base = mode === 'mes' ? startOfMonthUtc(today) : startOfWeekUtc(today);
  if (mode === 'mes') {
    if (base.getTime() < MIN_MONTH_START.getTime()) return new Date(MIN_MONTH_START);
    if (base.getTime() > MAX_MONTH_START.getTime()) return new Date(MAX_MONTH_START);
  } else {
    if (base.getTime() < MIN_WEEK_START.getTime()) return new Date(MIN_WEEK_START);
    if (base.getTime() > MAX_WEEK_START.getTime()) return new Date(MAX_WEEK_START);
  }
  return base;
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
  onCreateForDay,
  onEditItem,
  onDeleteItem,
  deletingId,
  todayKey,
}: {
  viewMode: ViewMode;
  calendarWeeks: CalendarDay[][];
  weekDays: CalendarDay[];
  itemsByDate: Map<string, AgendaListItem[]>;
  registerDayNode: (key: string, node: HTMLDivElement | null) => void;
  onCreateForDay: (day: CalendarDay) => void;
  onEditItem: (item: AgendaListItem) => void;
  onDeleteItem: (item: AgendaListItem) => Promise<void> | void;
  deletingId: string | null;
  todayKey: string;
}) {
  if (viewMode === 'mes') {
    return (
      <div
        className="grid gap-[var(--agenda-gap)]"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0,1fr))' }}
      >
        {calendarWeeks.flatMap((week) =>
          week.map((day) => (
            <CalendarDayTile
              key={day.key}
              day={day}
              items={itemsByDate.get(day.key) ?? EMPTY_ARRAY}
              registerDayNode={registerDayNode}
              onCreateForDay={onCreateForDay}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              deletingId={deletingId}
              isToday={day.key === todayKey}
              dimmed={!day.isCurrentMonth || !day.isWithinYear}
            />
          )),
        )}
      </div>
    );
  }

  return (
    <div
      className="grid gap-[var(--agenda-gap)]"
      style={{ gridTemplateColumns: 'repeat(7, minmax(0,1fr))' }}
    >
      {weekDays.map((day) => (
        <CalendarDayTile
          key={day.key}
          day={day}
          items={itemsByDate.get(day.key) ?? EMPTY_ARRAY}
          registerDayNode={registerDayNode}
          onCreateForDay={onCreateForDay}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
          deletingId={deletingId}
          isToday={day.key === todayKey}
          dimmed={!day.isWithinYear}
        />
      ))}
    </div>
  );
});

const CalendarDayTile = memo(function CalendarDayTile({
  day,
  items,
  registerDayNode,
  onCreateForDay,
  onEditItem,
  onDeleteItem,
  deletingId,
  isToday,
  dimmed,
}: {
  day: CalendarDay;
  items: AgendaListItem[];
  registerDayNode: (key: string, node: HTMLDivElement | null) => void;
  onCreateForDay: (day: CalendarDay) => void;
  onEditItem: (item: AgendaListItem) => void;
  onDeleteItem: (item: AgendaListItem) => Promise<void> | void;
  deletingId: string | null;
  isToday: boolean;
  dimmed: boolean;
}) {
  const refCallback = useCallback(
    (node: HTMLDivElement | null) => {
      registerDayNode(day.key, node);
    },
    [day.key, registerDayNode],
  );

  const weekday = getWeekdayLabel(day).toUpperCase();
  const dayNumber = DAY_FORMATTER.format(day.date);

  const handleCreate = useCallback(() => {
    if (!day.isWithinYear) return;
    onCreateForDay(day);
  }, [day, onCreateForDay]);

  return (
    <div
      ref={refCallback}
      className={[
        'relative flex flex-col rounded-2xl border border-gray-200/70 bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-shadow duration-150',
        'hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)]',
        dimmed ? 'opacity-60' : 'opacity-100',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ minHeight: 'var(--agenda-cell-h)' }}
    >
      <button
        type="button"
        onClick={handleCreate}
        disabled={!day.isWithinYear}
        className="flex items-center gap-2 p-2 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-[11px] uppercase tracking-wide text-gray-500">{weekday}</span>
        <span
          className={`ml-auto text-[12px] font-semibold rounded-full px-2 py-0.5 ${
            isToday ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-gray-50 text-gray-400'
          }`}
        >
          {dayNumber}
        </span>
        {isToday ? (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2">
        {items.slice(0, 3).map((item) => (
          <AgendaItemButton
            key={item.id}
            item={item}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
            deleting={deletingId === item.id}
          />
        ))}

        {items.length > 3 ? (
          <span className="px-3 text-[11px] text-gray-500">+ {items.length - 3} outros</span>
        ) : null}
      </div>

      {isToday ? (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-indigo-300/50 ring-offset-2" />
      ) : null}
    </div>
  );
});

CalendarDayTile.displayName = 'CalendarDayTile';
CalendarGrid.displayName = 'CalendarGrid';

function AgendaItemButton({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: AgendaListItem;
  onEdit: (item: AgendaListItem) => void;
  onDelete: (item: AgendaListItem) => Promise<void> | void;
  deleting: boolean;
}) {
  const [open, setOpen] = useState(false);

  const stroke = mapTypeStroke(item.type);
  const background = mapTypeBg(item.type);
  const color = mapTypeText(item.type);

  const handleEdit = useCallback(() => {
    onEdit(item);
    setOpen(false);
  }, [item, onEdit]);

  const handleDelete = useCallback(async () => {
    await onDelete(item);
    setOpen(false);
  }, [item, onDelete]);

  const dateLabel = useMemo(() => formatPopoverDate(item.date), [item.date]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="w-full truncate rounded-full border text-left text-[12px] px-3 py-1 transition-colors duration-150"
          style={{
            borderColor: stroke,
            background,
            color,
          }}
        >
          <span
            className="mr-2 inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: stroke }}
          />
          {item.title}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          className="z-[var(--z-pop)] w-[320px] rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur"
        >
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="text-xs text-gray-500">
                  {dateLabel}
                  {item.className ? <span> • {item.className}</span> : null}
                </div>
              </div>
              <span
                className="mt-1.5 h-2.5 w-2.5 rounded-full"
                style={{ background: stroke }}
              />
            </div>

            {item.description ? (
              <p className="max-h-[5.5rem] overflow-hidden text-[12px] leading-5 text-gray-600">
                {item.description}
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Popover.Close asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-slate-700 hover:bg-gray-50"
                  onClick={handleEdit}
                >
                  Editar
                </Button>
              </Popover.Close>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-xl border border-transparent px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                Excluir
              </Button>
            </div>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}


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

export default function AgendaCalendarCard({
  className = '',
  refreshToken = 0,
  onOpenEditor,
  editorLoading = false,
}: AgendaCalendarCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('mes');
  const [currentDate, setCurrentDate] = useState<Date>(() => resolveInitialDateForView('mes'));
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [items, setItems] = useState<AgendaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dayNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const todayKey = useMemo(() => toDateKey(setUtcMidnight(new Date())), []);

  const cardClassName = [
    'w-full rounded-[28px] border border-slate-100 bg-white shadow-[0_24px_45px_rgba(15,23,42,0.08)]',
    'flex h-full max-h-[640px] flex-col overflow-hidden',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const period = useMemo<PeriodContext>(() => {
    if (viewMode === 'mes') {
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
    if (viewMode !== 'mes') {
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
    if (viewMode !== 'semana') {
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
    if (viewMode === 'mes') {
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
    if (viewMode === 'mes') {
      const monthStart = startOfMonthUtc(currentDate);
      return monthStart.getTime() > MIN_MONTH_START.getTime();
    }
    const weekStart = startOfWeekUtc(currentDate);
    return weekStart.getTime() > MIN_WEEK_START.getTime();
  }, [currentDate, viewMode]);

  const canGoNext = useMemo(() => {
    if (viewMode === 'mes') {
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

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenEditor?.();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [onOpenEditor]);

  const calendarStartTime = period.calendarStart.getTime();
  const calendarEndTime = period.calendarEnd.getTime();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const node = dayNodeMap.current.get(todayKey);
    if (!node) return;
    if (container.scrollHeight <= container.clientHeight) return;
    const raf = window.requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [calendarStartTime, calendarEndTime, todayKey, viewMode]);

  const handleToggleView = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      setCurrentDate(resolveInitialDateForView(mode));
    },
    [],
  );

  const handlePrevPeriod = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'mes') {
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
      if (viewMode === 'mes') {
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

  const handleCreateForDay = useCallback(
    (day: CalendarDay) => {
      if (!day.isWithinYear) {
        return;
      }
      onOpenEditor?.({ presetDate: day.key });
    },
    [onOpenEditor],
  );

  const handleEditItem = useCallback(
    (item: AgendaListItem) => {
      onOpenEditor?.({ focusId: item.id });
    },
    [onOpenEditor],
  );

  const handleDeleteItem = useCallback(
    async (item: AgendaListItem) => {
      if (deletingId) return;
      try {
        setDeletingId(item.id);
        await deleteAgendaItem(item.id);
        setItems((prev) => prev.filter((entry) => entry.id !== item.id));
        toast.success('Item removido da agenda.');
      } catch (error) {
        console.error('[AgendaCalendarCard] Falha ao excluir item', error);
        toast.error('Não foi possível excluir o item.');
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId],
  );

  const handleQuickAdd = useCallback(() => {
    const candidate = clampToYear(period.fetchStart);
    onOpenEditor?.({ presetDate: toDateKey(candidate) });
  }, [onOpenEditor, period.fetchStart]);

  const isEmpty = !loading && visibleItemCount === 0;

  return (
    <section className={cardClassName}>
      <header className="px-6 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-2xl font-semibold text-slate-900">Agenda</h2>
          <div className="rounded-full bg-slate-100 p-1">
            {(['mes', 'semana'] as ViewMode[]).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleToggleView(mode)}
                  className={[
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white',
                  ].join(' ')}
                  aria-pressed={active}
                >
                  {mode === 'mes' ? 'MÊS' : 'SEMANA'}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {FILTER_OPTIONS.map((option) => {
              const active = activeFilter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setActiveFilter(option)}
                  className={[
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    active
                      ? 'bg-slate-900 text-white shadow-[0_6px_18px_rgba(15,23,42,0.18)]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                  aria-pressed={active}
                >
                  {FILTER_LABELS[option]}
                </button>
              );
            })}
          </div>

          <div
            className="ml-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600"
            role="group"
            tabIndex={0}
            onKeyDown={handleNavKey}
          >
            <button
              type="button"
              onClick={handlePrevPeriod}
              disabled={!canGoPrev || loading}
              aria-label={viewMode === 'mes' ? 'Mês anterior' : 'Semana anterior'}
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
              aria-label={viewMode === 'mes' ? 'Próximo mês' : 'Próxima semana'}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ›
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={editorLoading}
              onClick={() => onOpenEditor?.()}
              className="h-9 rounded-xl px-4"
            >
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={editorLoading}
              onClick={handleQuickAdd}
              className="h-9 rounded-xl px-4"
            >
              + Novo
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div
          ref={containerRef}
          className="relative h-full overflow-y-auto rounded-[24px] border border-slate-100 bg-slate-50/60 p-4"
        >
          <div className="space-y-3">
            {isEmpty && !loading ? <EmptyStateCompact onAdd={handleQuickAdd} disabled={editorLoading} /> : null}

            {loading && hasFetched ? (
              viewMode === 'mes' ? (
                <div
                  className="grid gap-[var(--agenda-gap)]"
                  style={{ gridTemplateColumns: 'repeat(7, minmax(0,1fr))' }}
                >
                  {Array.from({ length: 42 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-white/70 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
                      style={{ minHeight: 'var(--agenda-cell-h)' }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="grid gap-[var(--agenda-gap)]"
                  style={{ gridTemplateColumns: 'repeat(7, minmax(0,1fr))' }}
                >
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-white/70 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
                      style={{ minHeight: 'var(--agenda-cell-h)' }}
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
                registerDayNode={registerDayNode}
                onCreateForDay={handleCreateForDay}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                deletingId={deletingId}
                todayKey={todayKey}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

