import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import DashboardCard from '@/components/dashboard/DashboardCard';
import AvisosCard from '@/components/dashboard/AvisosCard';
import WeeklySchedule, { type WeeklyScheduleCellItem } from '@/components/dashboard/WeeklySchedule';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  addClassActivity,
  addClassMilestone,
  getClassCalendar,
  removeClassActivity,
  removeClassMilestone,
  type ClassCalendarItem,
  type ClassDetails,
} from '@/services/classes.service';

const SLOT_CONFIG = [
  { id: 1, label: '1º horário', time: '07:30 – 08:20' },
  { id: 2, label: '2º horário', time: '08:30 – 09:20' },
  { id: 3, label: '3º horário', time: '09:30 – 10:20' },
];

const WEEKDAY_CONFIG = [
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terça' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
];

const CALENDAR_BADGES: Record<ClassCalendarItem['type'], { label: string; className: string }> = {
  activity: { label: 'Atividade', className: 'bg-orange-100 text-orange-700' },
  milestone: { label: 'Data importante', className: 'bg-slate-200 text-slate-700' },
};

type CalendarScope = 'week' | 'month';

type CalendarEntry = ClassCalendarItem & { date: Date };

type TurmaResumoProps = {
  classId: string;
  classInfo?: ClassDetails | null;
  onCreateAnnouncement: () => void;
  onEditAnnouncement: (announcement: any) => void;
};

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const DAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });
const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

function normalizeScheduleCells(classId: string, classInfo?: ClassDetails | null): Record<string, WeeklyScheduleCellItem[]> {
  const cells: Record<string, WeeklyScheduleCellItem[]> = {};
  if (!classInfo?.schedule) {
    return cells;
  }

  const entries = Array.isArray(classInfo.schedule) ? classInfo.schedule : [];
  const discipline = classInfo.discipline || classInfo.subject || null;
  const seriesLabel = classInfo.name
    || (classInfo.series || classInfo.letter
      ? `Turma ${(classInfo.series || '')}${classInfo.letter || ''}`.trim()
      : null);
  const baseLabel = [discipline, seriesLabel].filter(Boolean).join(' — ') || discipline || seriesLabel || 'Aula';
  const color = classInfo.color || classInfo.themeColor || null;

  const addCell = (slot: number, weekday: number) => {
    if (!Number.isFinite(slot) || !Number.isFinite(weekday)) return;
    if (slot < 1 || slot > SLOT_CONFIG.length) return;
    if (weekday < 1 || weekday > WEEKDAY_CONFIG.length) return;
    const key = `${slot}-${weekday}`;
    if (!cells[key]) {
      cells[key] = [];
    }
    const exists = cells[key].some((item) => item.classId === classId);
    if (!exists) {
      cells[key].push({
        classId,
        label: baseLabel,
        color,
        className: seriesLabel,
        discipline,
      });
    }
  };

  entries.forEach((entry: any) => {
    if (!entry || typeof entry !== 'object') return;
    const slot = Number(entry.slot ?? entry.lesson ?? entry.timeSlot);
    const weekday = Number(entry.weekday ?? entry.weekDay ?? entry.day);
    if (Array.isArray(entry.days)) {
      entry.days.forEach((value: unknown) => addCell(slot, Number(value)));
      return;
    }
    if (Array.isArray(entry.weekdays) || Array.isArray(entry.weekDays)) {
      const list = (entry.weekdays ?? entry.weekDays) as unknown[];
      list.forEach((value) => addCell(slot, Number(value)));
      return;
    }
    addCell(slot, weekday);
  });

  return cells;
}

function formatCalendarHeading(date: Date): string {
  const weekdayRaw = WEEKDAY_FORMATTER.format(date).replace('.', '');
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const day = DAY_FORMATTER.format(date);
  const month = MONTH_FORMATTER.format(date).replace('.', '');
  const year = date.getFullYear();
  return `${weekday} • ${day} ${month} ${year}`;
}

function toCalendarEntry(item: ClassCalendarItem): CalendarEntry | null {
  if (!item?.dateISO) return null;
  const parsed = new Date(item.dateISO);
  if (Number.isNaN(parsed.getTime())) return null;
  return { ...item, date: parsed };
}

function isWithinWeek(date: Date, reference: Date): boolean {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function isWithinMonth(date: Date, reference: Date): boolean {
  return date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear();
}

export function TurmaResumo({ classId, classInfo, onCreateAnnouncement, onEditAnnouncement }: TurmaResumoProps) {
  const [calendarScope, setCalendarScope] = useState<CalendarScope>('week');
  const [calendarItems, setCalendarItems] = useState<CalendarEntry[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [savingMilestone, setSavingMilestone] = useState(false);

  const scheduleCells = useMemo(() => normalizeScheduleCells(classId, classInfo), [classId, classInfo]);
  const hasSchedule = useMemo(
    () => Object.values(scheduleCells).some((items) => Array.isArray(items) && items.length > 0),
    [scheduleCells]
  );

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    setCalendarError(null);
    try {
      const items = await getClassCalendar(classId);
      const normalized = items
        .map((item) => toCalendarEntry(item))
        .filter((entry): entry is CalendarEntry => Boolean(entry))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      setCalendarItems(normalized);
    } catch (err) {
      console.error('Erro ao carregar calendário da turma', err);
      setCalendarItems([]);
      setCalendarError('Não foi possível carregar o calendário desta turma.');
    } finally {
      setCalendarLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const filteredCalendarItems = useMemo(() => {
    if (!calendarItems.length) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureItems = calendarItems.filter((item) => item.date.getTime() >= today.getTime());
    if (calendarScope === 'month') {
      return futureItems.filter((item) => isWithinMonth(item.date, today));
    }
    return futureItems.filter((item) => isWithinWeek(item.date, today));
  }, [calendarItems, calendarScope]);

  const calendarGroups = useMemo(() => {
    if (!filteredCalendarItems.length) return [] as Array<{ iso: string; date: Date; items: CalendarEntry[] }>;
    const grouped = new Map<string, CalendarEntry[]>();
    filteredCalendarItems.forEach((item) => {
      const key = item.date.toISOString().slice(0, 10);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    });
    return Array.from(grouped.entries())
      .map(([iso, items]) => ({
        iso,
        date: new Date(`${iso}T00:00:00Z`),
        items: items.sort((a, b) => a.date.getTime() - b.date.getTime()),
      }))
      .sort((a, b) => (a.date.getTime() > b.date.getTime() ? 1 : -1));
  }, [filteredCalendarItems]);

  const handleRemoveItem = useCallback(
    async (item: CalendarEntry) => {
      const confirmed = typeof window === 'undefined' ? true : window.confirm('Remover este registro?');
      if (!confirmed) return;
      try {
        if (item.type === 'activity') {
          await removeClassActivity(classId, item.sourceId ?? item.id);
        } else {
          await removeClassMilestone(classId, item.sourceId ?? item.id);
        }
        toast.success('Registro removido.');
        await loadCalendar();
      } catch (err) {
        console.error('Erro ao remover item do calendário', err);
        toast.error('Não foi possível remover este registro.');
      }
    },
    [classId, loadCalendar]
  );

  const handleCreateActivity = async (payload: { title: string; dateISO?: string | null }) => {
    setSavingActivity(true);
    try {
      await addClassActivity(classId, { title: payload.title, dateISO: payload.dateISO });
      toast.success('Atividade cadastrada.');
      setActivityModalOpen(false);
      await loadCalendar();
    } catch (err) {
      console.error('Erro ao cadastrar atividade', err);
      const message = err instanceof Error ? err.message : 'Não foi possível cadastrar a atividade.';
      toast.error(message);
      throw err;
    } finally {
      setSavingActivity(false);
    }
  };

  const handleCreateMilestone = async (payload: { label: string; dateISO?: string | null }) => {
    setSavingMilestone(true);
    try {
      await addClassMilestone(classId, { label: payload.label, dateISO: payload.dateISO });
      toast.success('Data importante registrada.');
      setMilestoneModalOpen(false);
      await loadCalendar();
    } catch (err) {
      console.error('Erro ao registrar data importante', err);
      const message = err instanceof Error ? err.message : 'Não foi possível registrar a data importante.';
      toast.error(message);
      throw err;
    } finally {
      setSavingMilestone(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <DashboardCard title="Horários da semana" className="lg:col-span-8" contentClassName="flex-1">
          {hasSchedule ? (
            <WeeklySchedule slots={SLOT_CONFIG} days={WEEKDAY_CONFIG} cells={scheduleCells} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              Nenhum horário cadastrado para esta turma.
            </div>
          )}
        </DashboardCard>

        <AvisosCard
          className="lg:col-span-4"
          classId={classId}
          onCreate={onCreateAnnouncement}
          onEdit={onEditAnnouncement}
        />
      </div>

      <DashboardCard title="Calendário da Turma" contentClassName="flex-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                calendarScope === 'week' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
              }`}
              onClick={() => setCalendarScope('week')}
            >
              Semana
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                calendarScope === 'month' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
              }`}
              onClick={() => setCalendarScope('month')}
            >
              Mês
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setActivityModalOpen(true)}>
              Nova atividade
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMilestoneModalOpen(true)}>
              Nova data importante
            </Button>
          </div>
        </div>

        {calendarLoading ? (
          <div className="mt-6 flex flex-1 items-center justify-center">
            <div className="h-24 w-full max-w-md animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : calendarError ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{calendarError}</div>
        ) : calendarGroups.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Nenhum evento encontrado para o período selecionado.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {calendarGroups.map((group) => (
              <li key={group.iso} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {formatCalendarHeading(group.date)}
                </p>
                <ul className="mt-3 space-y-3">
                  {group.items.map((item) => {
                    const badge = CALENDAR_BADGES[item.type];
                    return (
                      <li
                        key={`${group.iso}-${item.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-800">{item.title || badge.label}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${badge.className}`}>
                              {badge.label}
                            </span>
                            {item.createdAt ? (
                              <span>Registrado em {new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                            ) : null}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item)}>
                          Remover
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <ActivityModal
        open={activityModalOpen}
        loading={savingActivity}
        onClose={() => setActivityModalOpen(false)}
        onSubmit={handleCreateActivity}
      />

      <MilestoneModal
        open={milestoneModalOpen}
        loading={savingMilestone}
        onClose={() => setMilestoneModalOpen(false)}
        onSubmit={handleCreateMilestone}
      />
    </div>
  );
}

type ActivityModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; dateISO?: string | null }) => Promise<void> | void;
};

function ActivityModal({ open, loading, onClose, onSubmit }: ActivityModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDate('');
    setError(null);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Informe o título da atividade.');
      return;
    }
    let iso: string | null | undefined;
    if (date) {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) {
        setError('Informe uma data válida.');
        return;
      }
      iso = parsed.toISOString();
    }
    await onSubmit({ title: trimmed, dateISO: iso });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form className="space-y-4 p-6 text-sm" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nova atividade</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
            ✕
          </button>
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Título
          <input
            type="text"
            value={title}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            placeholder="Ex.: Entrega do trabalho"
            disabled={loading}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Data (opcional)
          <input
            type="date"
            value={date}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            disabled={loading}
          />
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type MilestoneModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { label: string; dateISO?: string | null }) => Promise<void> | void;
};

function MilestoneModal({ open, loading, onClose, onSubmit }: MilestoneModalProps) {
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLabel('');
    setDate('');
    setError(null);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Informe o título da data importante.');
      return;
    }
    let iso: string | null | undefined;
    if (date) {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) {
        setError('Informe uma data válida.');
        return;
      }
      iso = parsed.toISOString();
    }
    await onSubmit({ label: trimmed, dateISO: iso });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form className="space-y-4 p-6 text-sm" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nova data importante</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
            ✕
          </button>
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Título
          <input
            type="text"
            value={label}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setLabel(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            placeholder="Ex.: Conselho de classe"
            disabled={loading}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Data (opcional)
          <input
            type="date"
            value={date}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            disabled={loading}
          />
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default TurmaResumo;
