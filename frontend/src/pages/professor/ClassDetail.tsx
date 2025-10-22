import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import AgendaReadOnlyCard from '@/components/dashboard/AgendaReadOnlyCard';
import Modal from '@/components/ui/Modal';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import {
  ClassActivity,
  ClassCalendarItem,
  ClassDetails,
  ClassMilestone,
  ClassNotice,
  ClassNoticeAudience,
  ClassStudent,
  UpsertStudentInput,
  addClassActivity,
  addClassMilestone,
  addClassNotice,
  addStudent,
  sendClassEmail,
  getClassCalendar,
  getClassDetails,
  removeClassActivity,
  removeClassMilestone,
  removeClassNotice,
  removeStudent,
  updateClassSchedule,
  updateStudent,
} from '@/services/classes.service';
import type { Weekday, TimeSlot } from '@/types/school';

function sortStudents(list: ClassStudent[]): ClassStudent[] {
  return [...list].sort((a, b) => {
    const aRoll = a.rollNumber ?? Number.POSITIVE_INFINITY;
    const bRoll = b.rollNumber ?? Number.POSITIVE_INFINITY;
    if (aRoll !== bRoll) return aRoll - bRoll;
    return a.name.localeCompare(b.name);
  });
}

function resolvePhotoUrl(photo?: string | null): string | null {
  if (!photo) return null;
  const normalized = photo.trim();
  if (!normalized) return null;
  if (normalized.startsWith('data:')) return normalized;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('blob:')) return normalized;
  return `data:image/jpeg;base64,${normalized}`;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const DATETIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const CALENDAR_DAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
});

function safeTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime();
}

function formatDateLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return DATE_FORMATTER.format(date);
}

function formatDateTimeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return DATETIME_FORMATTER.format(date);
}

function sortActivities(list: ClassActivity[]): ClassActivity[] {
  return [...list].sort((a, b) => {
    const tsA = safeTimestamp(a.dateISO ?? a.createdAt);
    const tsB = safeTimestamp(b.dateISO ?? b.createdAt);
    return tsB - tsA;
  });
}

function sortMilestones(list: ClassMilestone[]): ClassMilestone[] {
  return [...list].sort((a, b) => {
    const tsA = safeTimestamp(a.dateISO);
    const tsB = safeTimestamp(b.dateISO);
    return tsA - tsB;
  });
}

function sortNotices(list: ClassNotice[]): ClassNotice[] {
  return [...list].sort((a, b) => safeTimestamp(b.createdAt) - safeTimestamp(a.createdAt));
}

type ScheduleKey = `${Weekday}-${TimeSlot}`;

const WEEKDAYS: Array<{ value: Weekday; label: string; short: string }> = [
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
];

const TIME_SLOTS: Array<{ value: TimeSlot; label: string; range: string }> = [
  { value: 1, label: '1º tempo', range: '7h15 – 8h45' },
  { value: 2, label: '2º tempo', range: '9h – 10h30' },
  { value: 3, label: '3º tempo', range: '10h45 – 12h15' },
];

const WeekdaysSet = new Set<Weekday>(WEEKDAYS.map((item) => item.value));
const TimeSlotsSet = new Set<TimeSlot>(TIME_SLOTS.map((item) => item.value));

const DAY_NAME_TO_INDEX: Record<string, Weekday> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SEGUNDA: 1,
  TERCA: 2,
  'TERÇA': 2,
  QUARTA: 3,
  QUINTA: 4,
  SEXTA: 5,
};

const INDEX_TO_DAY: Record<Weekday, string> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
};

const SLOT_TO_TIME: Record<TimeSlot, string> = {
  1: '07:15',
  2: '09:00',
  3: '10:45',
};

const NOTICE_AUDIENCE_BADGES: Record<ClassNoticeAudience, { label: string; className: string }> = {
  teachers: { label: 'SOMENTE PROFESSORES', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  all: { label: 'VISÍVEL AOS ALUNOS', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
};

const CALENDAR_ITEM_BADGES: Record<ClassCalendarItem['type'], { label: string; className: string }> = {
  activity: { label: 'Atividade', className: 'border border-orange-200 bg-orange-50 text-orange-700' },
  milestone: { label: 'Data importante', className: 'border border-slate-200 bg-slate-50 text-slate-700' },
};

const NOTICE_AUDIENCE_OPTIONS: Array<{ value: ClassNoticeAudience; label: string }> = [
  { value: 'teachers', label: 'SOMENTE_PROFESSORES' },
  { value: 'all', label: 'ALUNOS_E_PROFESSORES' },
];

function buildScheduleKey(weekday: Weekday, slot: TimeSlot): ScheduleKey {
  return `${weekday}-${slot}` as ScheduleKey;
}

function createScheduleSet(schedule: any): Set<ScheduleKey> {
  const set = new Set<ScheduleKey>();
  if (!Array.isArray(schedule)) return set;
  schedule.forEach((entry) => {
    if (!entry) return;
    const slotRaw = entry.slot ?? entry.timeSlot ?? entry.periodo;
    const slot = typeof slotRaw === 'number' ? (slotRaw as TimeSlot) : (Number(slotRaw) as TimeSlot);
    if (!TimeSlotsSet.has(slot)) return;

    const pushDay = (value: unknown) => {
      let weekday: Weekday | undefined;
      if (typeof value === 'number') {
        weekday = DAY_NAME_TO_INDEX[String(value).toUpperCase()] ?? (value as Weekday);
      } else if (typeof value === 'string') {
        weekday = DAY_NAME_TO_INDEX[value.trim().toUpperCase()];
      }
      if (!weekday || Number.isNaN(slot)) return;
      if (!WeekdaysSet.has(weekday)) return;
      set.add(buildScheduleKey(weekday, slot));
    };

    if (Array.isArray(entry.days)) {
      entry.days.forEach(pushDay);
      return;
    }

    const weekdaysRaw = entry.weekdays ?? entry.weekDays;
    if (Array.isArray(weekdaysRaw)) {
      weekdaysRaw.forEach(pushDay);
      return;
    }

    const weekdayRaw = entry.weekday ?? entry.day ?? entry.weekDay;
    pushDay(weekdayRaw);
  });
  return set;
}

function setsAreEqual(a: Set<ScheduleKey>, b: Set<ScheduleKey>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function selectedSlotsToApiSchedule(selected: Set<ScheduleKey>): Array<{ slot: TimeSlot; days: Weekday[] }> {
  const grouped = new Map<TimeSlot, Set<Weekday>>();
  selected.forEach((key) => {
    const [weekdayStr, slotStr] = key.split('-');
    const slot = Number(slotStr) as TimeSlot;
    const weekday = Number(weekdayStr) as Weekday;
    if (!TimeSlotsSet.has(slot) || !WeekdaysSet.has(weekday)) return;
    if (!grouped.has(slot)) {
      grouped.set(slot, new Set());
    }
    grouped.get(slot)?.add(weekday);
  });
  return Array.from(grouped.entries())
    .map(([slot, daysSet]) => ({ slot, days: Array.from(daysSet).sort((a, b) => a - b) }))
    .sort((a, b) => a.slot - b.slot);
}

function selectedSlotsToDetailSchedule(selected: Set<ScheduleKey>) {
  return Array.from(selected).map((key) => {
    const [weekdayStr, slotStr] = key.split('-');
    const weekday = Number(weekdayStr) as Weekday;
    const slot = Number(slotStr) as TimeSlot;
    return {
      weekday,
      slot,
      day: INDEX_TO_DAY[weekday],
      time: SLOT_TO_TIME[slot],
    };
  });
}

type StudentModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialStudent?: ClassStudent | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: UpsertStudentInput) => Promise<void>;
};

type StudentFormState = {
  name: string;
  email: string;
  rollNumber: string;
  phone: string;
  password: string;
  generatePassword: boolean;
  sendInvite: boolean;
  photoFile: File | null;
  removePhoto: boolean;
};

function StudentModal({ open, mode, initialStudent, loading, onClose, onSubmit }: StudentModalProps) {
  const [form, setForm] = useState<StudentFormState>({
    name: '',
    email: '',
    rollNumber: '',
    phone: '',
    password: '',
    generatePassword: false,
    sendInvite: true,
    photoFile: null,
    removePhoto: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initialStudent?.name ?? '',
      email: initialStudent?.email ?? '',
      rollNumber:
        initialStudent?.rollNumber !== undefined && initialStudent?.rollNumber !== null
          ? String(initialStudent.rollNumber)
          : '',
      phone: initialStudent?.phone ?? '',
      password: '',
      generatePassword: false,
      sendInvite: mode === 'create',
      photoFile: null,
      removePhoto: false,
    });
    setError(null);
  }, [open, initialStudent, mode]);

  const title = mode === 'create' ? 'Adicionar aluno' : 'Editar aluno';

  const onFieldChange = (field: keyof StudentFormState, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onFieldChange('photoFile', file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    if (!trimmedName) {
      setError('Informe o nome do aluno.');
      return;
    }
    if (!trimmedEmail) {
      setError('Informe o email do aluno.');
      return;
    }

    if (!form.generatePassword && mode === 'create' && form.password.length < 6) {
      setError('Defina uma senha com pelo menos 6 caracteres ou marque "Gerar senha automaticamente".');
      return;
    }

    if (!form.generatePassword && form.password && form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (form.rollNumber) {
      const parsed = Number(form.rollNumber);
      if (Number.isNaN(parsed)) {
        setError('Número de chamada inválido.');
        return;
      }
    }

    const payload: UpsertStudentInput = {
      name: trimmedName,
      email: trimmedEmail,
      rollNumber: form.rollNumber === '' ? '' : Number(form.rollNumber),
      phone: form.phone.trim() || undefined,
      password: form.generatePassword ? undefined : form.password || undefined,
      generatePassword: form.generatePassword,
      sendInvite: form.sendInvite && (form.generatePassword || !!form.password),
      photoFile: form.photoFile,
      removePhoto: form.removePhoto,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o aluno.';
      setError(message);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            className="text-slate-400 transition hover:text-slate-600"
            onClick={onClose}
            aria-label="Fechar"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <div className="grid gap-3">
          <label className="text-sm font-semibold text-slate-700">Nome completo
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.name}
              onChange={(event) => onFieldChange('name', event.target.value)}
              required
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">E-mail
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.email}
              onChange={(event) => onFieldChange('email', event.target.value)}
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Número (chamada)
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.rollNumber}
                onChange={(event) => onFieldChange('rollNumber', event.target.value)}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">Telefone
              <input
                type="tel"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.phone}
                onChange={(event) => onFieldChange('phone', event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.generatePassword}
              onChange={(event) => onFieldChange('generatePassword', event.target.checked)}
            />
            Gerar senha automaticamente
          </label>
          {!form.generatePassword && (
            <label className="text-sm font-semibold text-slate-700">Senha
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.password}
                onChange={(event) => onFieldChange('password', event.target.value)}
              />
            </label>
          )}
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.sendInvite}
              onChange={(event) => onFieldChange('sendInvite', event.target.checked)}
              disabled={!(form.generatePassword || (!!form.password && form.password.length >= 6))}
            />
            Enviar convite por e-mail
          </label>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Foto do aluno
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              onChange={handleFileChange}
            />
          </label>
          {initialStudent?.photo && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.removePhoto}
                onChange={(event) => onFieldChange('removePhoto', event.target.checked)}
              />
              Remover foto atual
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando…' : mode === 'create' ? 'Adicionar aluno' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type ScheduleModalProps = {
  open: boolean;
  saving: boolean;
  hasChanges: boolean;
  draftSlots: Set<ScheduleKey>;
  onClose: () => void;
  onToggle: (weekday: Weekday, slot: TimeSlot) => void;
  onSave: () => void;
};

function ScheduleModal({ open, saving, hasChanges, draftSlots, onClose, onToggle, onSave }: ScheduleModalProps) {
  if (!open) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-5xl">
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Editar horários da semana</h2>
          <button
            type="button"
            className="text-slate-400 transition hover:text-slate-600"
            onClick={onClose}
            aria-label="Fechar"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 pb-6 pt-4 text-sm text-slate-700">
          <p>
            Selecione os tempos de aula da turma. Salve para atualizar o quadro de horários.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Horário
                  </th>
                  {WEEKDAYS.map((day) => (
                    <th
                      key={day.value}
                      className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {day.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot.value} className="border-t border-slate-200">
                    <td className="px-3 py-3 align-top text-slate-800">
                      <div className="font-medium">{slot.label}</div>
                      <div className="text-xs text-slate-500">{slot.range}</div>
                    </td>
                    {WEEKDAYS.map((day) => {
                      const key = buildScheduleKey(day.value, slot.value);
                      const checked = draftSlots.has(key);
                      return (
                        <td key={key} className="px-3 py-3 text-center align-middle">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-ys-amber focus:ring-ys-amber"
                            checked={checked}
                            onChange={() => onToggle(day.value, slot.value)}
                            disabled={saving}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={!hasChanges || saving}>
              {saving ? 'Salvando…' : 'Salvar horários'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

type EmailModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { subject: string; message: string; includeTeachers: boolean }) => Promise<void>;
};

function EmailModal({ open, loading, onClose, onSubmit }: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includeTeachers, setIncludeTeachers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubject('');
    setMessage('');
    setIncludeTeachers(true);
    setError(null);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject) {
      setError('Informe o assunto do e-mail.');
      return;
    }
    if (!trimmedMessage) {
      setError('Informe a mensagem do e-mail.');
      return;
    }
    setError(null);
    try {
      await onSubmit({ subject: trimmedSubject, message: trimmedMessage, includeTeachers });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar o e-mail.';
      setError(message);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4 text-sm text-slate-700">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-lg font-semibold text-slate-800">Enviar e-mail para a turma</h2>
          <button
            type="button"
            className="text-slate-400 transition hover:text-slate-600"
            onClick={onClose}
            aria-label="Fechar"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <p>
          O e-mail será enviado em cópia oculta para os alunos e, opcionalmente, professores da turma.
        </p>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-slate-700">Assunto</span>
          <input
            type="text"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={loading}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-slate-700">Mensagem</span>
          <textarea
            className="min-h-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={loading}
            placeholder="Escreva a mensagem que será enviada para a turma."
            required
          />
          <span className="text-xs text-slate-500">
            Use quebras de linha para separar parágrafos; elas serão convertidas automaticamente no e-mail.
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeTeachers}
            onChange={(event) => setIncludeTeachers(event.target.checked)}
            disabled={loading}
          />
          <span className="text-slate-700">Enviar também aos professores da turma</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar e-mail'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type FeedbackState = {
  message: string;
  tone: 'info' | 'success' | 'error';
};

const FEEDBACK_STYLES: Record<FeedbackState['tone'], string> = {
  info: 'border-ys-line bg-white text-ys-ink',
  success: 'border-green-200 bg-green-50 text-green-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
};

type ActivityModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; dateISO?: string | null }) => Promise<void>;
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

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Informe um título para a atividade.');
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

    try {
      await onSubmit({ title: trimmedTitle, dateISO: iso });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar a atividade.';
      setError(message);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Cadastrar atividade</h2>
          <button
            type="button"
            className="text-slate-400 transition hover:text-slate-600"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700">Título</span>
          <input
            type="text"
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-ys-amber focus:outline-none"
            value={title}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
            placeholder="Ex.: Entregar ficha de leitura"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700">Data (opcional)</span>
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-ys-amber focus:outline-none"
            value={date}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
            disabled={loading}
          />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar atividade'}
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
  onSubmit: (payload: { label: string; dateISO?: string | null }) => Promise<void>;
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

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
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

    try {
      await onSubmit({ label: trimmedLabel, dateISO: iso });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar a data importante.';
      setError(message);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Adicionar data importante</h2>
          <button
            type="button"
            className="text-slate-400 transition hover:text-slate-600"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700">Descrição</span>
          <input
            type="text"
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-ys-amber focus:outline-none"
            value={label}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setLabel(event.target.value)}
            placeholder="Ex.: Conselho de classe"
            disabled={loading}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700">Data (opcional)</span>
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-ys-amber focus:outline-none"
            value={date}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
            disabled={loading}
          />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar data'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


type NoticeModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { message: string; audience: ClassNoticeAudience }) => Promise<void>;
};


function NoticeModal({ open, loading, onClose, onSubmit }: NoticeModalProps) {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<ClassNoticeAudience>('teachers');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMessage('');
    setAudience('teachers');
    setError(null);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Escreva o conteúdo do aviso.');
      return;
    }

    try {
      await onSubmit({ message: trimmed, audience });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Não foi possível salvar o aviso.';
      setError(errorMessage);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Registrar aviso interno</h2>
          <button
            type="button"
            className="text-slate-400 transition hover:text-slate-600"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-700">Mensagem</span>
          <textarea
            className="min-h-[160px] rounded-xl border border-slate-200 px-3 py-2 focus:border-ys-amber focus:outline-none"
            value={message}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)}
            placeholder="Escreva o lembrete para os professores desta turma..."
            disabled={loading}
          />
        </label>

        <fieldset className="rounded-xl border border-slate-200 px-4 py-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Visibilidade do aviso</legend>
          <div className="mt-3 space-y-2">
            {NOTICE_AUDIENCE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="notice-audience"
                  value={option.value}
                  checked={audience === option.value}
                  onChange={(event) => setAudience(event.target.value as ClassNoticeAudience)}
                  disabled={loading}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar aviso'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type ClassTabKey = 'overview' | 'students';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClassDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ClassStudent | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<ScheduleKey>>(new Set());
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<Set<ScheduleKey>>(new Set());
  const [quickModal, setQuickModal] = useState<'activity' | 'notice' | 'milestone' | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<ClassCalendarItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [activeTab, setActiveTab] = useState<ClassTabKey>(() => {
    const state = location.state as { initialTab?: ClassTabKey } | null;
    if (state?.initialTab) return state.initialTab;
    return 'overview';
  });
  const tabItems = useMemo<TabItem[]>(() => {
    const base: TabItem[] = [
      {
        key: 'overview',
        label: 'Resumo',
        isActive: activeTab === 'overview',
        onClick: () => setActiveTab('overview'),
      },
      {
        key: 'students',
        label: 'Alunos',
        isActive: activeTab === 'students',
        onClick: () => setActiveTab('students'),
      },
    ];

    if (id) {
      base.push({ key: 'grades', label: 'Notas', to: `/professor/classes/${id}/grades` });
    }

    return base;
  }, [activeTab, id]);

  const showFeedback = useCallback((message: string, tone: FeedbackState['tone'] = 'info') => {
    setFeedback({ message, tone });
  }, []);

  const applyClassDetail = useCallback((data: ClassDetails | null) => {
    if (!data) {
      setDetail(null);
      return;
    }
    const scheduleSet = createScheduleSet(data.schedule);
    setSelectedSlots(scheduleSet);
    setScheduleDraft(new Set(scheduleSet));
    const normalizedSchedule = selectedSlotsToDetailSchedule(scheduleSet);
    setDetail({
      ...data,
      schedule: normalizedSchedule,
      students: sortStudents(data.students),
      activities: sortActivities(data.activities ?? []),
      milestones: sortMilestones(data.milestones ?? []),
      notices: sortNotices(data.notices ?? []),
    });
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getClassDetails(id);
      if (!data) {
        setError('Turma não encontrada.');
        setDetail(null);
      } else {
        applyClassDetail(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar turma.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id, applyClassDetail]);

  const loadCalendar = useCallback(async () => {
    if (!id) return;
    setCalendarLoading(true);
    setCalendarError(null);
    try {
      const events = await getClassCalendar(id);
      setCalendarEvents(events);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar calendário.';
      setCalendarError(message);
    } finally {
      setCalendarLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const scheduleModalHasChanges = useMemo(() => !setsAreEqual(scheduleDraft, selectedSlots), [scheduleDraft, selectedSlots]);
  const today = useMemo(() => new Date(), []);
  const sortedCalendarEvents = useMemo(() => {
    return calendarEvents
      .filter((item) => safeTimestamp(item.dateISO) > 0)
      .sort((a, b) => safeTimestamp(a.dateISO) - safeTimestamp(b.dateISO));
  }, [calendarEvents]);
  const calendarEventsForView = useMemo(() => {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startTs = startOfToday.getTime();
    const weekEndTs = startTs + 7 * 24 * 60 * 60 * 1000;
    const monthStartTs = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const monthEndTs = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();

    const filtered = sortedCalendarEvents.filter((event) => {
      const ts = safeTimestamp(event.dateISO);
      if (ts <= 0) return false;
      if (calendarView === 'week') {
        return ts >= startTs && ts < weekEndTs;
      }
      return ts >= monthStartTs && ts < monthEndTs;
    });

    if (filtered.length > 0) return filtered;
    return sortedCalendarEvents.slice(0, Math.min(sortedCalendarEvents.length, 5));
  }, [sortedCalendarEvents, calendarView, today]);
  const calendarGroups = useMemo(() => {
    const groups = new Map<string, { dateISO: string; label: string; items: ClassCalendarItem[] }>();
    calendarEventsForView.forEach((event) => {
      const ts = safeTimestamp(event.dateISO);
      if (ts <= 0) return;
      const date = new Date(ts);
      const key = date.toISOString().slice(0, 10);
      if (!groups.has(key)) {
        groups.set(key, {
          dateISO: date.toISOString(),
          label: CALENDAR_DAY_FORMATTER.format(date),
          items: [],
        });
      }
      const bucket = groups.get(key);
      if (bucket) {
        bucket.items.push(event);
      }
    });
    const ordered = Array.from(groups.values());
    ordered.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
    return ordered;
  }, [calendarEventsForView]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingStudent(null);
  };

  const handleOpenScheduleModal = () => {
    setScheduleDraft(new Set(selectedSlots));
    setScheduleModalOpen(true);
  };

  const handleCloseScheduleModal = () => {
    setScheduleDraft(new Set(selectedSlots));
    setScheduleModalOpen(false);
  };

  const handleToggleDraftSlot = (weekday: Weekday, slot: TimeSlot) => {
    setScheduleDraft((prev) => {
      const next = new Set(prev);
      const key = buildScheduleKey(weekday, slot);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleScheduleModalSave = () => {
    const next = new Set(scheduleDraft);
    void handleSaveSchedule(next);
  };

  const handleSaveSchedule = async (slots: Set<ScheduleKey>) => {
    if (!id) return;
    setScheduleSaving(true);
    setFeedback(null);
    setTemporaryPassword(null);
    try {
      const payload = selectedSlotsToApiSchedule(slots);
      await updateClassSchedule(id, payload);
      const refreshed = await getClassDetails(id);
      if (!refreshed) {
        throw new Error('Não foi possível carregar os horários atualizados.');
      }
      applyClassDetail(refreshed);
      showFeedback('Horários atualizados com sucesso.', 'success');
      setScheduleModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar horários da turma.';
      showFeedback(message, 'error');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleOpenEmailModal = () => {
    setTemporaryPassword(null);
    setFeedback(null);
    setEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    setEmailModalOpen(false);
  };

  const handleSendClassEmail = async ({
    subject,
    message,
    includeTeachers,
  }: {
    subject: string;
    message: string;
    includeTeachers: boolean;
  }) => {
    if (!id) {
      throw new Error('Turma inválida.');
    }

    setEmailSending(true);
    setFeedback(null);
    try {
      const result = await sendClassEmail(id, {
        subject,
        text: message,
        includeTeachers,
      });

      const skipped = result.skipped;
      const hasWarnings =
        skipped.studentsWithoutEmail.length > 0 ||
        (includeTeachers && skipped.teachersWithoutEmail.length > 0) ||
        skipped.duplicateEmails.length > 0;

      const tone: FeedbackState['tone'] = hasWarnings ? 'info' : 'success';
      const combinedMessage = result.message || 'E-mail enviado com sucesso.';
      showFeedback(combinedMessage, tone);
      handleCloseEmailModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar e-mail para a turma.';
      showFeedback(errorMessage, 'error');
      throw new Error(errorMessage);
    } finally {
      setEmailSending(false);
    }
  };

  const handleNotifyClass = () => {
    setTemporaryPassword(null);
    setFeedback(null);
    setQuickModal('notice');
  };

  const handleOpenActivityModal = () => {
    setTemporaryPassword(null);
    setFeedback(null);
    setQuickModal('activity');
  };

  const handleOpenMilestoneModal = () => {
    setTemporaryPassword(null);
    setFeedback(null);
    setQuickModal('milestone');
  };

  const handleAddClick = () => {
    setEditingStudent(null);
    setModalOpen(true);
    setTemporaryPassword(null);
  };

  const handleStudentNavigate = (studentId: string) => {
    if (!id) return;
    navigate(`/professor/classes/${id}/students/${studentId}`, {
      state: { initialTab: 'students' as ClassTabKey },
    });
  };

  const handleEditClick = (student: ClassStudent) => {
    setEditingStudent(student);
    setModalOpen(true);
    setTemporaryPassword(null);
  };

  const handleCreateStudent = async (payload: UpsertStudentInput) => {
    if (!id) return;
    setSaving(true);
    setFeedback(null);
    setTemporaryPassword(null);
    try {
      const result = await addStudent(id, payload);
      setDetail((prev) => {
        if (!prev) return prev;
        const students = sortStudents([...prev.students, result.student]);
        return { ...prev, students, studentsCount: result.studentsCount };
      });
      showFeedback('Aluno criado com sucesso.', 'success');
      if (result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStudent = async (payload: UpsertStudentInput) => {
    if (!id || !editingStudent) return;
    setSaving(true);
    setFeedback(null);
    setTemporaryPassword(null);
    try {
      const result = await updateStudent(id, editingStudent.id, payload);
      setDetail((prev) => {
        if (!prev) return prev;
        const students = sortStudents(
          prev.students.map((s) => (s.id === result.student.id ? result.student : s))
        );
        return { ...prev, students, studentsCount: result.studentsCount };
      });
      showFeedback('Aluno atualizado com sucesso.', 'success');
      if (result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (student: ClassStudent) => {
    if (!id) return;
    const confirm = window.confirm(`Remover o aluno ${student.name}?`);
    if (!confirm) return;
    setDeletingId(student.id);
    setFeedback(null);
    setTemporaryPassword(null);
    try {
      const result = await removeStudent(id, student.id);
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.filter((s) => s.id !== student.id),
          studentsCount: result.studentsCount,
        };
      });
      showFeedback('Aluno removido com sucesso.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover aluno.';
      showFeedback(message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmitActivity = async (payload: { title: string; dateISO?: string | null }) => {
    if (!id) throw new Error('Turma inválida.');
    setQuickSaving(true);
    setTemporaryPassword(null);
    try {
      const saved = await addClassActivity(id, payload);
      setDetail((prev) => {
        if (!prev) return prev;
        const activities = sortActivities([...prev.activities, saved]);
        return { ...prev, activities };
      });
      void loadCalendar();
      showFeedback('Atividade cadastrada com sucesso.', 'success');
      setQuickModal(null);
    } catch (err) {
      throw err;
    } finally {
      setQuickSaving(false);
    }
  };

  const handleRemoveActivity = async (activity: ClassActivity) => {
    if (!id) return;
    const confirm = window.confirm('Remover esta atividade?');
    if (!confirm) return;
    setTemporaryPassword(null);
    setFeedback(null);
    try {
      await removeClassActivity(id, activity.id);
      setDetail((prev) => {
        if (!prev) return prev;
        return { ...prev, activities: prev.activities.filter((item) => item.id !== activity.id) };
      });
      void loadCalendar();
      showFeedback('Atividade removida.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover atividade.';
      showFeedback(message, 'error');
    }
  };

  const handleSubmitMilestone = async (payload: { label: string; dateISO?: string | null }) => {
    if (!id) throw new Error('Turma inválida.');
    setQuickSaving(true);
    setTemporaryPassword(null);
    try {
      const saved = await addClassMilestone(id, payload);
      setDetail((prev) => {
        if (!prev) return prev;
        const milestones = sortMilestones([...prev.milestones, saved]);
        return { ...prev, milestones };
      });
      void loadCalendar();
      showFeedback('Data importante registrada.', 'success');
      setQuickModal(null);
    } catch (err) {
      throw err;
    } finally {
      setQuickSaving(false);
    }
  };

  const handleRemoveMilestone = async (milestone: ClassMilestone) => {
    if (!id) return;
    const confirm = window.confirm('Remover esta data importante?');
    if (!confirm) return;
    setTemporaryPassword(null);
    setFeedback(null);
    try {
      await removeClassMilestone(id, milestone.id);
      setDetail((prev) => {
        if (!prev) return prev;
        return { ...prev, milestones: prev.milestones.filter((item) => item.id !== milestone.id) };
      });
      void loadCalendar();
      showFeedback('Data importante removida.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover data importante.';
      showFeedback(message, 'error');
    }
  };

  const handleCalendarItemRemove = async (item: ClassCalendarItem) => {
    if (!detail) return;
    if (item.type === 'activity') {
      const target = detail.activities.find((activity) => activity.id === item.sourceId || activity.id === item.id);
      if (!target) {
        showFeedback('Atividade não encontrada para remoção.', 'error');
        return;
      }
      await handleRemoveActivity(target);
      return;
    }

    const target = detail.milestones.find((milestone) => milestone.id === item.sourceId || milestone.id === item.id);
    if (!target) {
      showFeedback('Data importante não encontrada para remoção.', 'error');
      return;
    }
    await handleRemoveMilestone(target);
  };

  const handleSubmitNotice = async (payload: { message: string; audience: ClassNoticeAudience }) => {
    if (!id) throw new Error('Turma inválida.');
    setQuickSaving(true);
    setTemporaryPassword(null);
    try {
      const saved = await addClassNotice(id, payload);
      setDetail((prev) => {
        if (!prev) return prev;
        const notices = sortNotices([...prev.notices, saved]);
        return { ...prev, notices };
      });
      showFeedback('Aviso registrado com sucesso.', 'success');
      setQuickModal(null);
    } catch (err) {
      throw err;
    } finally {
      setQuickSaving(false);
    }
  };

  const handleRemoveNotice = async (notice: ClassNotice) => {
    if (!id) return;
    const confirm = window.confirm('Remover este aviso?');
    if (!confirm) return;
    setTemporaryPassword(null);
    setFeedback(null);
    try {
      await removeClassNotice(id, notice.id);
      setDetail((prev) => {
        if (!prev) return prev;
        return { ...prev, notices: prev.notices.filter((item) => item.id !== notice.id) };
      });
      showFeedback('Aviso removido.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover aviso.';
      showFeedback(message, 'error');
    }
  };

  if (!id) {
    return (
      <div className="p-4">
        <p className="text-red-600">ID de turma inválido.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Carregando turma…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-600">{error}</p>
        <Button variant="ghost" onClick={fetchDetail}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <p className="text-red-600">Turma não encontrada.</p>
      </div>
    );
  }

  const subjectLabel = detail.discipline ?? detail.subject ?? 'Disciplina';
  const rawName = typeof detail.name === 'string' ? detail.name.trim() : '';
  const fallbackLabel = [detail.series, detail.letter].filter(Boolean).join('');
  let prefixedName: string;
  if (rawName) {
    prefixedName = rawName.toLowerCase().startsWith('turma') ? rawName : `Turma ${rawName}`;
  } else if (fallbackLabel) {
    prefixedName = `Turma ${fallbackLabel}`;
  } else {
    prefixedName = 'Turma';
  }
  const pageTitle = subjectLabel ? `${prefixedName} • ${subjectLabel}` : prefixedName;

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{pageTitle}</h1>
          {detail.year && (
            <p className="text-sm text-slate-500">Ano letivo: {detail.year}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-3" />
      </div>

      <div className="border-b border-slate-200 pb-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm">
          <Tabs items={tabItems} />
        </div>
      </div>

      {feedback && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${FEEDBACK_STYLES[feedback.tone]}`}>
          {feedback.message}
        </div>
      )}
      {activeTab === 'students' && temporaryPassword && (
        <div className="rounded-xl border border-ys-amber bg-amber-50 px-4 py-3 text-sm text-ys-ink">
          Senha temporária gerada: <strong>{temporaryPassword}</strong>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          <section className="grid grid-cols-1 gap-4">
            <div className="col-span-full w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Horários da semana</h2>
                </div>
                <Button onClick={handleOpenScheduleModal}>Editar horários</Button>
              </div>
              {selectedSlots.size === 0 ? (
                <p className="mt-6 text-sm text-slate-500">Nenhum horário cadastrado.</p>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-xs">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">
                          Horário
                        </th>
                        {WEEKDAYS.map((day) => (
                          <th key={day.value} className="px-3 py-2 text-center font-semibold uppercase tracking-wide text-slate-600">
                            {day.short}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_SLOTS.map((slot) => (
                        <tr key={slot.value} className="border-t border-slate-200">
                          <td className="px-3 py-3 align-top text-slate-800">
                            <div className="font-medium">{slot.label}</div>
                            <div className="text-xs text-slate-500">{slot.range}</div>
                          </td>
                          {WEEKDAYS.map((day) => {
                            const key = buildScheduleKey(day.value, slot.value);
                            const active = selectedSlots.has(key);
                            return (
                              <td key={key} className="px-3 py-3 text-center align-middle">
                                <div className="flex items-center justify-center">
                                  <div
                                    className={`h-6 w-6 rounded-full border ${active ? 'border-ys-amber bg-ys-amber/20' : 'border-dashed border-slate-300'}`}
                                    aria-hidden="true"
                                  />
                                </div>
                                <span className="sr-only">{active ? 'Tempo reservado' : 'Tempo livre'}</span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="col-span-full w-full">
              {id ? <AgendaReadOnlyCard classId={id} className="w-full" /> : null}
            </div>
          </section>

          
        </>
      )}
      {activeTab === 'students' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Alunos</h2>
            <Button variant="ghost" onClick={handleAddClick}>
              + Adicionar aluno
            </Button>
          </div>

          {detail.students.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Nenhum aluno cadastrado.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">#</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Aluno</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Telefone</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {detail.students.map((student) => {
                    const photoUrl = resolvePhotoUrl(student.photo);
                    return (
                      <tr
                        key={student.id}
                        className="cursor-pointer transition hover:bg-slate-100"
                        onClick={() => handleStudentNavigate(student.id)}
                      >
                        <td className="px-3 py-2 align-middle text-slate-800">
                          {student.rollNumber ?? '—'}
                        </td>
                        <td className="px-3 py-2 align-middle text-slate-800">
                          <div className="flex items-center gap-3">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={student.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                                {student.name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle text-slate-500">{student.email ?? '—'}</td>
                        <td className="px-3 py-2 align-middle text-slate-500">{student.phone ?? '—'}</td>
                        <td className="px-3 py-2 align-middle text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditClick(student);
                              }}
                              className="text-sm font-medium text-ys-amber hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await handleDeleteStudent(student);
                              }}
                              className="text-sm font-medium text-red-500 hover:underline"
                              disabled={deletingId === student.id}
                            >
                              {deletingId === student.id ? 'Removendo…' : 'Excluir'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <EmailModal
        open={emailModalOpen}
        loading={emailSending}
        onClose={handleCloseEmailModal}
        onSubmit={handleSendClassEmail}
      />
      <StudentModal
        open={modalOpen}
        mode={editingStudent ? 'edit' : 'create'}
        initialStudent={editingStudent}
        loading={saving}
        onClose={closeModal}
        onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent}
      />
      <ActivityModal
        open={quickModal === 'activity'}
        loading={quickSaving}
        onClose={() => setQuickModal(null)}
        onSubmit={handleSubmitActivity}
      />
      <NoticeModal
        open={quickModal === 'notice'}
        loading={quickSaving}
        onClose={() => setQuickModal(null)}
        onSubmit={handleSubmitNotice}
      />
      <MilestoneModal
        open={quickModal === 'milestone'}
        loading={quickSaving}
        onClose={() => setQuickModal(null)}
        onSubmit={handleSubmitMilestone}
      />
      <ScheduleModal
        open={scheduleModalOpen}
        saving={scheduleSaving}
        hasChanges={scheduleModalHasChanges}
        draftSlots={scheduleDraft}
        onClose={handleCloseScheduleModal}
        onToggle={handleToggleDraftSlot}
        onSave={handleScheduleModalSave}
      />
    </div>
  );
}
