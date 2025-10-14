import { useCallback, useEffect, useMemo, useState } from 'react';
import Avatar from '@/components/Avatar';
import ScheduleTable from '@/components/ScheduleTable';
import { Tabs } from '@/components/ui/Tabs';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import { useAuth } from '@/store/AuthContext';
import {
  getStudentProfile,
  getStudentWeeklySchedule,
  listStudentUpcomingExams,
  listStudentUpcomingContents,
  listStudentAnnouncements,
  getStudentNotebookSummary,
  getStudentGrades,
} from '@/services/student';
import { toast } from 'react-toastify';

type StudentProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  className?: string | null;
  series?: number | null;
  letter?: string | null;
  discipline?: string | null;
  class?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type StudentScheduleEntry = {
  day: string;
  slot: number;
  label: string;
};

type StudentExam = {
  id: string;
  title: string;
  date?: string | null;
  className?: string | null;
  weight?: number | null;
};

type StudentContent = {
  id: string;
  title: string;
  date?: string | null;
  className?: string | null;
};

type StudentAnnouncement = {
  id: string;
  message?: string | null;
  title?: string | null;
  date?: string | null;
  createdAt?: string | null;
};

type StudentNotebookItem = {
  id: string;
  title: string;
  date?: string | null;
  done?: boolean;
};

type StudentNotebookSummary = {
  totalValue?: number | null;
  seenCount?: number | null;
  items?: StudentNotebookItem[];
};

type StudentGradeActivity = {
  id: string;
  title?: string | null;
  score?: number | null;
  weight?: number | null;
  date?: string | null;
};

type StudentGrades = {
  activities?: StudentGradeActivity[];
  notebookScore?: number | null;
};

const STUDENT_TABS = [
  { key: 'overview', label: 'Resumo', to: '/aluno/resumo', end: true },
  { key: 'grades', label: 'Minhas Notas', to: '/aluno/notas' },
  { key: 'essays', label: 'Redações', to: '/aluno/redacoes' },
  { key: 'pas', label: 'PAS/UnB', to: '/aluno/pas-unb' },
];

const BIMESTERS = [1, 2, 3, 4] as const;

const DATE_SHORT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const DATE_LONG = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' });

function normalizeId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    const idCandidate = raw.id ?? raw._id ?? raw.sourceId;
    if (typeof idCandidate === 'string' || typeof idCandidate === 'number') {
      return String(idCandidate);
    }
  }
  return '';
}

function unwrapData<T>(input: unknown): T {
  if (input && typeof input === 'object') {
    const dataCandidate = (input as Record<string, unknown>).data;
    if (dataCandidate !== undefined) {
      return unwrapData<T>(dataCandidate);
    }
  }
  return input as T;
}

function normalizeProfile(raw: unknown): StudentProfile | null {
  if (!raw) return null;
  const candidate = unwrapData<any>(raw);
  const base = candidate?.user ?? candidate?.student ?? candidate;
  if (!base) return null;
  const id = normalizeId(base);
  const classInfo = base.class ?? base.classroom ?? base.turma ?? {};
  const series = base.series ?? classInfo.series ?? null;
  const letter = base.letter ?? classInfo.letter ?? null;
  const discipline = base.discipline ?? classInfo.discipline ?? classInfo.subject ?? null;
  const className =
    base.className ||
    classInfo.name ||
    [series ? `${series}º` : null, letter, discipline].filter(Boolean).join(' • ') ||
    null;

  return {
    ...(typeof base === 'object' ? base : {}),
    id,
    name: base.name ?? base.nome ?? null,
    email: base.email ?? null,
    photoUrl: base.photoUrl ?? base.photo ?? null,
    className,
    series: series ?? null,
    letter: letter ?? null,
    discipline: discipline ?? null,
    class: classInfo && typeof classInfo === 'object' ? classInfo : null,
  } as StudentProfile;
}

function normalizeSchedule(raw: unknown): StudentScheduleEntry[] {
  const list = unwrapData<unknown[]>(raw);
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, unknown>;
      const day =
        (entry.day as string) ||
        (entry.weekday as string) ||
        (entry.weekDay as string) ||
        (entry.dayName as string) ||
        '';
      const slotRaw = entry.slot ?? entry.lesson ?? entry.timeSlot;
      const slot = Number(slotRaw);
      const label =
        (entry.label as string) ??
        (entry.className as string) ??
        (entry.subject as string) ??
        (entry.discipline as string) ??
        '—';
      if (!day || Number.isNaN(slot)) return null;
      return { day, slot, label };
    })
    .filter((item): item is StudentScheduleEntry => Boolean(item));
}

function normalizeExamList(raw: unknown): StudentExam[] {
  const list = unwrapData<unknown[]>(raw);
  if (!Array.isArray(list)) return [];
  const mapped: Array<StudentExam | null> = list.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const entry = item as Record<string, unknown>;
    const date =
      (entry.date as string) ??
      (entry.dateISO as string) ??
      (entry.scheduledFor as string) ??
      null;
    const exam: StudentExam = {
      id: normalizeId(entry),
      title: (entry.title as string) ?? (entry.name as string) ?? 'Avaliação',
      date,
      className: (entry.className as string) ?? (entry.classLabel as string) ?? null,
      weight: (entry.weight as number) ?? (entry.value as number) ?? null,
    };
    return exam.id ? exam : null;
  });
  const filtered = mapped.filter((item): item is StudentExam => item !== null);
  return filtered.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
    const db = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
    return da - db;
  });
}

function normalizeContentList(raw: unknown): StudentContent[] {
  const list = unwrapData<unknown[]>(raw);
  if (!Array.isArray(list)) return [];
  const mapped: Array<StudentContent | null> = list.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const entry = item as Record<string, unknown>;
    const content: StudentContent = {
      id: normalizeId(entry),
      title: (entry.title as string) ?? (entry.name as string) ?? 'Conteúdo',
      date: (entry.date as string) ?? (entry.dateISO as string) ?? null,
      className: (entry.className as string) ?? null,
    };
    return content.id ? content : null;
  });
  const filtered = mapped.filter((item): item is StudentContent => item !== null);
  return filtered.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
    const db = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
    return da - db;
  });
}

function normalizeAnnouncements(raw: unknown): StudentAnnouncement[] {
  const list = unwrapData<unknown[]>(raw);
  if (!Array.isArray(list)) return [];
  const mapped: Array<StudentAnnouncement | null> = list.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const entry = item as Record<string, unknown>;
    const announcement: StudentAnnouncement = {
      id: normalizeId(entry),
      message: (entry.message as string) ?? (entry.title as string) ?? null,
      title: (entry.title as string) ?? null,
      date: (entry.date as string) ?? (entry.scheduledFor as string) ?? null,
      createdAt: (entry.createdAt as string) ?? null,
    };
    return announcement.id ? announcement : null;
  });
  const filtered = mapped.filter((item): item is StudentAnnouncement => item !== null);
  return filtered.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : -Infinity;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : -Infinity;
    return db - da;
  });
}

function normalizeNotebook(raw: unknown): StudentNotebookSummary {
  const value = unwrapData<any>(raw) ?? {};
  const items = Array.isArray(value.items) ? (value.items as unknown[]) : [];
  return {
    totalValue: typeof value.totalValue === 'number' ? value.totalValue : null,
    seenCount: typeof value.seenCount === 'number' ? value.seenCount : null,
    items: items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const entry = item as Record<string, unknown>;
        const notebookItem: StudentNotebookItem = {
          id: normalizeId(entry),
          title: (entry.title as string) ?? 'Registro',
          date: (entry.date as string) ?? null,
          done: Boolean(entry.done ?? entry.checked ?? entry.seen),
        };
        return notebookItem.id ? notebookItem : null;
      })
      .filter((item): item is StudentNotebookItem => item !== null),
  };
}

function normalizeGrades(raw: unknown): StudentGrades {
  const value = unwrapData<any>(raw) ?? {};
  const activities = Array.isArray(value.activities) ? (value.activities as unknown[]) : [];
  return {
    activities: activities
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const entry = item as Record<string, unknown>;
        const activity: StudentGradeActivity = {
          id: normalizeId(entry),
          title: (entry.title as string) ?? (entry.name as string) ?? 'Atividade',
          score: typeof entry.score === 'number' ? entry.score : entry.score ? Number(entry.score) : null,
          weight: typeof entry.weight === 'number' ? entry.weight : entry.weight ? Number(entry.weight) : null,
          date: (entry.date as string) ?? (entry.dateISO as string) ?? null,
        };
        return activity.id ? activity : null;
      })
      .filter((item): item is StudentGradeActivity => item !== null),
    notebookScore:
      typeof value.notebookScore === 'number'
        ? value.notebookScore
        : value.notebookScore
          ? Number(value.notebookScore)
          : null,
  };
}

function currentBimester(): number {
  const month = new Date().getMonth();
  const estimate = Math.floor(month / 2) + 1;
  if (estimate < 1) return 1;
  if (estimate > 4) return 4;
  return estimate;
}

function formatDate(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return DATE_SHORT.format(date);
}

function formatLongDate(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return DATE_LONG.format(date);
}

function resolveClassLabel(profile: StudentProfile | null): string {
  if (!profile) return '';
  if (profile.className) return profile.className;
  const classInfo = (profile.class as Record<string, unknown>) || {};
  const parts = [
    profile.series ? `${profile.series}º` : null,
    profile.letter ?? (classInfo.letter as string) ?? null,
    profile.discipline ?? (classInfo.discipline as string) ?? (classInfo.subject as string) ?? null,
  ].filter(Boolean);
  return parts.join(' • ');
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint && <p className="mt-1 text-sm text-white/80">{hint}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">{message}</p>;
}

export default function ResumoAlunoPage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [schedule, setSchedule] = useState<StudentScheduleEntry[]>([]);
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [contents, setContents] = useState<StudentContent[]>([]);
  const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([]);
  const [notebook, setNotebook] = useState<StudentNotebookSummary>({});
  const [grades, setGrades] = useState<StudentGrades>({});
  const [staticLoading, setStaticLoading] = useState(true);
  const [termLoading, setTermLoading] = useState(true);
  const [term, setTerm] = useState<number>(currentBimester());

  const handleLogout = useCallback(() => {
    void logout({ redirect: true, location: '/login-aluno' });
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const rawProfile = await getStudentProfile();
        if (cancelled) return;
        const normalized = normalizeProfile(rawProfile);
        if (!normalized || !normalized.id) {
          throw new Error('Não foi possível identificar o aluno');
        }
        setProfile(normalized);
        setStudentId(normalized.id);
      } catch (error) {
        console.error('Erro ao carregar perfil do aluno', error);
        if (!cancelled) {
          toast.error('Não foi possível carregar seu perfil');
        }
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setStaticLoading(true);

    const loadStaticData = async () => {
      try {
        const [scheduleData, examData, contentData, announcementData] = await Promise.all([
          getStudentWeeklySchedule(studentId),
          listStudentUpcomingExams(studentId, { limit: 5 }),
          listStudentUpcomingContents(studentId, { limit: 5 }),
          listStudentAnnouncements(studentId, { limit: 5 }),
        ]);
        if (cancelled) return;
        setSchedule(normalizeSchedule(scheduleData));
        setExams(normalizeExamList(examData));
        setContents(normalizeContentList(contentData));
        setAnnouncements(normalizeAnnouncements(announcementData));
      } catch (error) {
        console.error('Erro ao carregar dados gerais do aluno', error);
        if (!cancelled) {
          toast.error('Falha ao buscar seus próximos compromissos');
        }
      } finally {
        if (!cancelled) setStaticLoading(false);
      }
    };

    loadStaticData();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setTermLoading(true);

    const loadTermData = async () => {
      try {
        const [notebookData, gradesData] = await Promise.all([
          getStudentNotebookSummary(studentId, term),
          getStudentGrades(studentId, term),
        ]);
        if (cancelled) return;
        setNotebook(normalizeNotebook(notebookData));
        setGrades(normalizeGrades(gradesData));
      } catch (error) {
        console.error('Erro ao carregar notas do aluno', error);
        if (!cancelled) {
          toast.error('Não foi possível carregar suas notas agora');
        }
      } finally {
        if (!cancelled) setTermLoading(false);
      }
    };

    loadTermData();
    return () => {
      cancelled = true;
    };
  }, [studentId, term]);

  const loading = staticLoading || termLoading;

  const notebookProgress = useMemo(() => {
    const totalItems = notebook.items?.length ?? 0;
    if (!totalItems) return 0;
    const seen = notebook.items?.filter((item) => item.done).length ?? 0;
    return Math.round((seen / totalItems) * 100);
  }, [notebook]);

  const totalPoints = useMemo(() => {
    const activitySum = (grades.activities ?? []).reduce((sum, activity) => sum + (activity.score ?? 0), 0);
    return activitySum + (grades.notebookScore ?? 0);
  }, [grades]);

  const nextExam = exams[0] ?? null;
  const stats = {
    notebookProgress,
    totalPoints,
    upcomingExams: exams.length,
  };

  const firstActivities = useMemo(() => {
    const list = [...(grades.activities ?? [])];
    return list
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      })
      .slice(0, 5);
  }, [grades.activities]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#ff9556] via-[#ff7a00] to-[#ff4f6d] px-6 py-8 text-white shadow-[0_30px_70px_rgba(255,122,0,0.35)] sm:px-10 sm:py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-5">
            <Avatar
              src={profile?.photoUrl ?? (user?.photoUrl as string | undefined) ?? undefined}
              name={(profile?.name ?? user?.name ?? 'Aluno') as string}
              size={72}
              className="border-2 border-white/40 shadow-lg"
            />
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-white/70">Olá</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-[34px]">
                {profile?.name ?? user?.name ?? 'Aluno'}
              </h1>
              <p className="mt-2 text-white/80">
                {resolveClassLabel(profile) || 'Turma não informada'}
              </p>
              {profile?.email && <p className="text-sm text-white/70">{profile.email}</p>}
            </div>
          </div>
          <div className="flex-1 rounded-3xl bg-white/10 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Próxima avaliação</p>
            {nextExam ? (
              <div className="mt-3 space-y-1">
                <p className="text-lg font-semibold">
                  {formatLongDate(nextExam.date)}
                </p>
                <p className="text-sm text-white/80">{nextExam.title}</p>
                {nextExam.className && <p className="text-sm text-white/70">{nextExam.className}</p>}
                {nextExam.weight && (
                  <p className="text-xs text-white/70">Valor: {nextExam.weight}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/80">Nenhuma avaliação agendada nos próximos dias.</p>
            )}
          </div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <HeroStat label="Pontuação no bimestre" value={stats.totalPoints.toFixed(1)} />
          <HeroStat label="Progresso do caderno" value={`${stats.notebookProgress}%`} hint="Itens vistos no período" />
          <HeroStat label="Próximas avaliações" value={String(stats.upcomingExams)} hint="Registradas nas próximas semanas" />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="absolute right-6 top-6 rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/70 hover:bg-white/10"
        >
          Sair
        </button>
      </section>

      <div className="mt-10">
        <Tabs items={STUDENT_TABS} />
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-slate-500">Carregando dados do aluno…</div>
      ) : (
        <div className="mt-10 space-y-10">
          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card className="overflow-hidden">
              <CardBody className="sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Agenda semanal</CardTitle>
                    <CardSub>Visualize as aulas por horário</CardSub>
                  </div>
                </div>
                <div className="mt-6">
                  {schedule.length ? (
                    <ScheduleTable schedules={schedule} />
                  ) : (
                    <EmptyState message="Sua grade será exibida aqui assim que disponível." />
                  )}
                </div>
              </CardBody>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardBody>
                  <CardTitle>Próximos conteúdos</CardTitle>
                  <CardSub>Os próximos encontros e temas planejados</CardSub>
                  <div className="mt-4 space-y-4">
                    {contents.length ? (
                      contents.map((content) => (
                        <div key={content.id} className="rounded-xl border border-slate-200 px-4 py-3">
                          <p className="text-sm font-semibold text-ys-ink">{content.title}</p>
                          <p className="text-xs text-ys-ink-2">{formatDate(content.date)}</p>
                          {content.className && (
                            <p className="text-xs text-ys-ink-2">{content.className}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <EmptyState message="Nenhum conteúdo previsto no intervalo informado." />
                    )}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <CardTitle>Avisos recentes</CardTitle>
                  <CardSub>Comunicados importantes dos professores</CardSub>
                  <div className="mt-4 space-y-4">
                    {announcements.length ? (
                      announcements.map((announcement) => (
                        <div key={announcement.id} className="rounded-xl border border-slate-200 px-4 py-3">
                          <p className="text-sm font-medium text-ys-ink">{announcement.message ?? 'Aviso'}</p>
                          <p className="text-xs text-ys-ink-2">
                            {formatDate(announcement.createdAt ?? announcement.date)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyState message="Você será avisado aqui quando houver novidades." />
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardBody>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Notas do bimestre</CardTitle>
                    <CardSub>Resultados das avaliações registradas</CardSub>
                  </div>
                  <Tabs
                    items={BIMESTERS.map((value) => ({
                      key: String(value),
                      label: `${value}º`,
                      isActive: term === value,
                      onClick: () => setTerm(value),
                    }))}
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/60 px-5 py-4">
                  <p className="text-sm font-semibold text-orange-700">Pontuação acumulada</p>
                  <p className="text-3xl font-bold text-orange-700">{totalPoints.toFixed(1)}</p>
                  <p className="text-xs text-orange-700/80">Inclui avaliações e caderno do período</p>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Atividade</th>
                        <th className="px-4 py-3">Nota</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {firstActivities.length ? (
                        firstActivities.map((activity) => (
                          <tr key={activity.id} className="bg-white">
                            <td className="px-4 py-3 font-medium text-ys-ink">{activity.title}</td>
                            <td className="px-4 py-3 text-ys-ink-2">{activity.score ?? '—'}</td>
                            <td className="px-4 py-3 text-ys-ink-2">{activity.weight ?? '—'}</td>
                            <td className="px-4 py-3 text-ys-ink-2">{formatDate(activity.date)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                            Nenhuma nota lançada no bimestre selecionado.
                          </td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-semibold text-ys-ink">
                        <td className="px-4 py-3">Caderno</td>
                        <td className="px-4 py-3">{notebook.items?.filter((item) => item.done).length ?? 0}</td>
                        <td className="px-4 py-3">{notebook.totalValue ?? '—'}</td>
                        <td className="px-4 py-3">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <CardTitle>Resumo do caderno</CardTitle>
                <CardSub>Entregas acompanhadas pelos professores</CardSub>
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-ys-ink">Itens vistos</p>
                    <p className="text-3xl font-bold text-ys-ink">{notebook.items?.filter((item) => item.done).length ?? 0}</p>
                    <p className="text-xs text-ys-ink-2">
                      de {notebook.items?.length ?? 0} registros
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ys-ink">Progresso</p>
                    <p className="text-3xl font-bold text-ys-ink">{stats.notebookProgress}%</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {(notebook.items ?? []).slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-ys-ink">{item.title}</p>
                        <p className="text-xs text-ys-ink-2">{formatDate(item.date)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.done ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-600'}`}>
                        {item.done ? 'Visto' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                  {!(notebook.items ?? []).length && (
                    <EmptyState message="Os registros do caderno aparecerão aqui quando forem lançados." />
                  )}
                </div>
              </CardBody>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
