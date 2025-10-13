import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  ClassDetails,
  ClassStudent,
  UpsertStudentInput,
  addStudent,
  updateClassSchedule,
  getClassDetails,
  removeStudent,
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

function buildScheduleKey(weekday: Weekday, slot: TimeSlot): ScheduleKey {
  return `${weekday}-${slot}` as ScheduleKey;
}

function createScheduleSet(schedule: any): Set<ScheduleKey> {
  const set = new Set<ScheduleKey>();
  if (!Array.isArray(schedule)) return set;
  schedule.forEach((entry) => {
    if (!entry) return;
    const weekdayRaw = entry.weekday ?? entry.day ?? entry.weekDay;
    const slotRaw = entry.slot ?? entry.timeSlot ?? entry.periodo;
    let weekday: Weekday | undefined;
    if (typeof weekdayRaw === 'number') {
      weekday = DAY_NAME_TO_INDEX[String(weekdayRaw).toUpperCase()] ?? (weekdayRaw as Weekday);
    } else if (typeof weekdayRaw === 'string') {
      weekday = DAY_NAME_TO_INDEX[weekdayRaw.trim().toUpperCase()];
    }
    const slot = typeof slotRaw === 'number' ? (slotRaw as TimeSlot) : (Number(slotRaw) as TimeSlot);
    if (!weekday || Number.isNaN(slot)) return;
    if (!WeekdaysSet.has(weekday) || !TimeSlotsSet.has(slot)) return;
    set.add(buildScheduleKey(weekday, slot));
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

function selectedSlotsToPayload(selected: Set<ScheduleKey>): Array<{ weekday: Weekday; slot: TimeSlot }> {
  return Array.from(selected).map((key) => {
    const [weekdayStr, slotStr] = key.split('-');
    return {
      weekday: Number(weekdayStr) as Weekday,
      slot: Number(slotStr) as TimeSlot,
    };
  });
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

  if (!open) return null;

  const title = mode === 'create' ? 'Adicionar aluno' : 'Editar aluno';

  const onFieldChange = (field: keyof StudentFormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    onFieldChange('photoFile', file ?? null);
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
      rollNumber:
        form.rollNumber === '' ? '' : Number(form.rollNumber),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-ys-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ys-ink">{title}</h2>
            <button
              type="button"
              className="text-ys-graphite hover:text-ys-ink"
              onClick={onClose}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ys-ink">Nome</span>
              <input
                type="text"
                className="rounded-xl border border-ys-line px-3 py-2 text-sm focus:border-ys-amber focus:outline-none"
                value={form.name}
                onChange={(e) => onFieldChange('name', e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ys-ink">Email</span>
              <input
                type="email"
                className="rounded-xl border border-ys-line px-3 py-2 text-sm focus:border-ys-amber focus:outline-none"
                value={form.email}
                onChange={(e) => onFieldChange('email', e.target.value)}
                required
              />
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ys-ink">Número (chamada)</span>
                <input
                  type="number"
                  min={0}
                  className="rounded-xl border border-ys-line px-3 py-2 text-sm focus:border-ys-amber focus:outline-none"
                  value={form.rollNumber}
                  onChange={(e) => onFieldChange('rollNumber', e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ys-ink">Telefone</span>
                <input
                  type="tel"
                  className="rounded-xl border border-ys-line px-3 py-2 text-sm focus:border-ys-amber focus:outline-none"
                  value={form.phone}
                  onChange={(e) => onFieldChange('phone', e.target.value)}
                />
              </label>
            </div>

            <div className="rounded-xl border border-ys-line px-3 py-3">
              <label className="flex items-center gap-2 text-sm font-medium text-ys-ink">
                <input
                  type="checkbox"
                  checked={form.generatePassword}
                  onChange={(e) => onFieldChange('generatePassword', e.target.checked)}
                />
                Gerar senha automaticamente
              </label>
              <p className="mt-1 text-xs text-ys-graphite">
                Ao marcar, uma senha aleatória será criada. Caso deixe desmarcado, informe a senha manualmente.
              </p>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ys-ink">Senha</span>
              <input
                type="password"
                className="rounded-xl border border-ys-line px-3 py-2 text-sm focus:border-ys-amber focus:outline-none"
                value={form.password}
                onChange={(e) => onFieldChange('password', e.target.value)}
                placeholder={form.generatePassword ? 'Gerada automaticamente' : ''}
                disabled={form.generatePassword}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-ys-ink">
              <input
                type="checkbox"
                checked={form.sendInvite}
                onChange={(e) => onFieldChange('sendInvite', e.target.checked)}
                disabled={!(form.generatePassword || (!!form.password && form.password.length >= 6))}
              />
              Enviar credenciais por e-mail ao salvar
            </label>

            <div className="grid gap-2 text-sm">
              <label className="font-medium text-ys-ink">Foto do aluno</label>
              <input type="file" accept="image/*" onChange={handleFileChange} />
              {initialStudent?.photo && (
                <label className="flex items-center gap-2 text-xs text-ys-graphite">
                  <input
                    type="checkbox"
                    checked={form.removePhoto}
                    onChange={(e) => onFieldChange('removePhoto', e.target.checked)}
                  />
                  Remover foto atual
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando…' : mode === 'create' ? 'Adicionar' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ClassTabKey = 'overview' | 'schedule' | 'students';

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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<ScheduleKey>>(new Set());
  const [initialSelectedSlots, setInitialSelectedSlots] = useState<Set<ScheduleKey>>(new Set());
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ClassTabKey>(() => {
    const state = location.state as { initialTab?: ClassTabKey } | null;
    if (state?.initialTab) return state.initialTab;
    return 'overview';
  });
  const tabs: Array<{ key: 'overview' | 'schedule' | 'students'; label: string }> = [
    { key: 'overview', label: 'Resumo' },
    { key: 'schedule', label: 'Horários' },
    { key: 'students', label: 'Alunos' },
  ];

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
        const scheduleSet = createScheduleSet(data.schedule);
        setSelectedSlots(scheduleSet);
        setInitialSelectedSlots(new Set(scheduleSet));
        setDetail({ ...data, students: sortStudents(data.students) });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar turma.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const hasScheduleChanges = useMemo(() => !setsAreEqual(selectedSlots, initialSelectedSlots), [selectedSlots, initialSelectedSlots]);
  const scheduleCount = selectedSlots.size;

  const closeModal = () => {
    setModalOpen(false);
    setEditingStudent(null);
  };

  const handleToggleSlot = (weekday: Weekday, slot: TimeSlot) => {
    setSelectedSlots((prev) => {
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

  const handleSaveSchedule = async () => {
    if (!id) return;
    setScheduleSaving(true);
    setFeedback(null);
    setTemporaryPassword(null);
    try {
      const payload = selectedSlotsToPayload(selectedSlots);
      const updated = await updateClassSchedule(id, payload);
      const updatedSet = createScheduleSet(updated.schedule);
      setSelectedSlots(updatedSet);
      setInitialSelectedSlots(new Set(updatedSet));
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          name: updated.name ?? prev.name,
          subject: updated.subject ?? prev.subject,
          discipline: updated.subject ?? prev.discipline,
          studentsCount: updated.studentsCount ?? prev.studentsCount,
          teachersCount: updated.teachersCount ?? prev.teachersCount,
          schedule: selectedSlotsToDetailSchedule(updatedSet),
        };
      });
      setFeedback('Horários atualizados com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar horários da turma.';
      setFeedback(message);
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleNotifyClass = () => {
    setTemporaryPassword(null);
    setFeedback('Funcionalidade de avisos estará disponível em breve.');
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
      setFeedback('Aluno criado com sucesso.');
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
      setFeedback('Aluno atualizado com sucesso.');
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
      setFeedback('Aluno removido com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover aluno.';
      setFeedback(message);
    } finally {
      setDeletingId(null);
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
  const totalStudents = detail.studentsCount ?? detail.students.length;
  const totalTeachers = detail.teachersCount ?? detail.teachers.length;

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ys-ink">{pageTitle}</h1>
          {detail.year && (
            <p className="text-sm text-ys-graphite">Ano letivo: {detail.year}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={handleNotifyClass}>
            Enviar aviso à turma
          </Button>
          {activeTab === 'students' && (
            <Button onClick={handleAddClick}>Adicionar aluno</Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-ys-line pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-t-xl px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border border-ys-line border-b-white bg-white text-ys-ink shadow-ys-sm'
                  : 'text-ys-graphite hover:text-ys-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="rounded-xl border border-ys-line bg-white px-4 py-3 text-sm text-ys-ink">
          {feedback}
        </div>
      )}
      {activeTab === 'students' && temporaryPassword && (
        <div className="rounded-xl border border-ys-amber bg-amber-50 px-4 py-3 text-sm text-ys-ink">
          Senha temporária gerada: <strong>{temporaryPassword}</strong>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          <section className="rounded-2xl border border-ys-line bg-white p-4 shadow-ys-sm">
            <h2 className="text-lg font-semibold text-ys-ink">Resumo da turma</h2>
            <div className="mt-3 grid gap-2 text-sm text-ys-graphite">
              <span>Horários: {scheduleCount}</span>
              <span>Alunos: {totalStudents}</span>
              <span>Professores: {totalTeachers}</span>
            </div>
          </section>

          <section className="rounded-2xl border border-ys-line bg-white p-4 shadow-ys-sm">
            <h2 className="text-lg font-semibold text-ys-ink">Professores</h2>
            {detail.teachers.length === 0 ? (
              <p className="mt-2 text-sm text-ys-graphite">Nenhum professor vinculado.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-ys-ink">
                {detail.teachers.map((teacher) => (
                  <li key={teacher.id} className="flex flex-col">
                    <span className="font-medium">{teacher.name}</span>
                    <span className="text-ys-graphite">{teacher.email}</span>
                    {teacher.subjects.length > 0 && (
                      <span className="text-xs text-ys-graphite">
                        {teacher.subjects.join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {activeTab === 'schedule' && (
        <section className="rounded-2xl border border-ys-line bg-white p-4 shadow-ys-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ys-ink">Quadro de horários</h2>
            <Button onClick={handleSaveSchedule} disabled={!hasScheduleChanges || scheduleSaving}>
              {scheduleSaving ? 'Salvando…' : 'Salvar horários'}
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ys-graphite">
                    Horário
                  </th>
                  {WEEKDAYS.map((day) => (
                    <th
                      key={day.value}
                      className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-ys-graphite"
                    >
                      {day.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot.value} className="border-t border-ys-line">
                    <td className="px-3 py-3 align-top text-ys-ink">
                      <div className="font-medium">{slot.label}</div>
                      <div className="text-xs text-ys-graphite">{slot.range}</div>
                    </td>
                    {WEEKDAYS.map((day) => {
                      const key = buildScheduleKey(day.value, slot.value);
                      const checked = selectedSlots.has(key);
                      return (
                        <td key={key} className="px-3 py-3 text-center align-middle">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-ys-line text-ys-amber focus:ring-ys-amber"
                            checked={checked}
                            onChange={() => handleToggleSlot(day.value, slot.value)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'students' && (
        <section className="rounded-2xl border border-ys-line bg-white p-4 shadow-ys-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ys-ink">Alunos</h2>
            <Button variant="ghost" onClick={handleAddClick}>
              + Adicionar aluno
            </Button>
          </div>

          {detail.students.length === 0 ? (
            <p className="mt-3 text-sm text-ys-graphite">Nenhum aluno cadastrado.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-ys-line text-sm">
                <thead className="bg-ys-bg">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-ys-graphite">#</th>
                    <th className="px-3 py-2 text-left font-medium text-ys-graphite">Aluno</th>
                    <th className="px-3 py-2 text-left font-medium text-ys-graphite">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-ys-graphite">Telefone</th>
                    <th className="px-3 py-2 text-right font-medium text-ys-graphite">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ys-line">
                  {detail.students.map((student) => {
                    const photoUrl = resolvePhotoUrl(student.photo);
                    return (
                      <tr
                        key={student.id}
                        className="cursor-pointer transition hover:bg-ys-bg"
                        onClick={() => handleStudentNavigate(student.id)}
                      >
                        <td className="px-3 py-2 align-middle text-ys-ink">
                          {student.rollNumber ?? '—'}
                        </td>
                        <td className="px-3 py-2 align-middle text-ys-ink">
                          <div className="flex items-center gap-3">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={student.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ys-bg text-xs font-semibold text-ys-graphite">
                                {student.name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle text-ys-graphite">{student.email ?? '—'}</td>
                        <td className="px-3 py-2 align-middle text-ys-graphite">{student.phone ?? '—'}</td>
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

      <StudentModal
        open={modalOpen}
        mode={editingStudent ? 'edit' : 'create'}
        initialStudent={editingStudent}
        loading={saving}
        onClose={closeModal}
        onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent}
      />
    </div>
  );
}
