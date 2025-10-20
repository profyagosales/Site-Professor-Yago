import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { toast } from 'react-toastify';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { getHome } from '@/services/student';
import { getClassColorPair } from '@/lib/colors';
import type { StudentLayoutContextValue } from '@/layouts/StudentLayout';

type StudentHomeAnnouncement = {
  id: string;
  title?: string | null;
  html?: string | null;
  message?: string | null;
  attachments?: Array<{ url: string; mime?: string | null; name?: string | null }>;
  createdAt?: string | null;
  audience?: 'ALUNOS' | 'PROFESSORES' | 'AMBOS';
};

type StudentHomeAgendaItem = {
  id: string;
  kind: 'ATIVIDADE' | 'DATA';
  title: string;
  dateISO: string | null;
  tags?: string[];
};

type StudentHomeActivity = {
  id: string;
  title: string;
  dateISO: string | null;
  term: number | null;
  tag: string;
  status?: string | null;
};

type StudentHomeGradePlan = {
  year: number;
  term: number;
  activities: Array<{ id: string; name: string; points: number }>;
};

type StudentHomeStats = {
  byTerm: Record<string, { avg: number; median: number; n: number }>;
  byActivity: Record<string, Array<{ activityId: string; avg: number; n?: number }>>;
};

type StudentHomeData = {
  class: {
    id: string;
    name: string | null;
    color: string | null;
    year: number | null;
    schedule: Array<{ slot: number; days: number[]; subject?: string | null }>;
  } | null;
  announcements: StudentHomeAnnouncement[];
  agenda: StudentHomeAgendaItem[];
  atividades: StudentHomeActivity[];
  gradePlan: StudentHomeGradePlan | null;
  gradeStats: StudentHomeStats;
};

type StudentHomeResponse = {
  success: boolean;
  data: StudentHomeData;
};

const WEEK_DAYS = [
  { id: 1, label: 'Segunda', short: 'Seg.' },
  { id: 2, label: 'Terça', short: 'Ter.' },
  { id: 3, label: 'Quarta', short: 'Qua.' },
  { id: 4, label: 'Quinta', short: 'Qui.' },
  { id: 5, label: 'Sexta', short: 'Sex.' },
] as const;

const SLOT_CONFIG = [
  { id: 1, label: '1º', time: '07:15 – 08:45' },
  { id: 2, label: '2º', time: '09:00 – 10:30' },
  { id: 3, label: '3º', time: '10:45 – 12:15' },
] as const;

const DATE_LONG = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'long',
});

const DATE_SHORT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
});

const TIME_RELATIVE = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  CONCLUIDA: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-700' },
  ATRASADA: { label: 'Atrasada', className: 'bg-rose-100 text-rose-700' },
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatDateLong(value: string | null | undefined) {
  if (!isNonEmptyString(value)) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return DATE_LONG.format(date);
}

function formatDateShort(value: string | null | undefined) {
  if (!isNonEmptyString(value)) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_SHORT.format(date);
}

function formatRelative(value: string | null | undefined) {
  if (!isNonEmptyString(value)) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = date.getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoje';
  return TIME_RELATIVE.format(days, 'day');
}

function sanitizeHtml(html: string | null | undefined) {
  if (!isNonEmptyString(html)) return { __html: '' };
  return { __html: DOMPurify.sanitize(html) };
}

function groupScheduleEntries(entries: Array<{ slot: number; days: number[] }>) {
  const grouped = new Map<string, boolean>();
  entries.forEach((entry) => {
    if (!entry || !Number.isInteger(entry.slot) || !Array.isArray(entry.days)) return;
    entry.days.forEach((day) => {
      if (!Number.isInteger(day)) return;
      grouped.set(`${entry.slot}-${day}`, true);
    });
  });
  return grouped;
}

function sumPoints(activities: StudentHomeGradePlan['activities'] | undefined) {
  if (!activities?.length) return 0;
  return activities.reduce((acc, activity) => acc + Number(activity.points ?? 0), 0);
}

export default function ResumoAlunoPage() {
  const { profile } = useOutletContext<StudentLayoutContextValue>();

  const [home, setHome] = useState<StudentHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [termLoading, setTermLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<number>(1);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementsPaused, setAnnouncementsPaused] = useState(false);
  const [announcementsModalOpen, setAnnouncementsModalOpen] = useState(false);
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadHome = useCallback(
    async (options?: { term?: number; notify?: boolean }) => {
      const term = options?.term;
      const notify = options?.notify ?? !term;

      if (term !== undefined) {
        setTermLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = (await getHome(
          term !== undefined ? { term } : undefined,
        )) as StudentHomeResponse;
        if (!mountedRef.current) return;

        if (response?.success) {
          setHome(response.data);
          const nextTerm = response.data?.gradePlan?.term ?? term ?? selectedTerm;
          if (Number.isFinite(nextTerm)) {
            setSelectedTerm(Number(nextTerm));
          }
          if (notify) {
            toast.success('Carregado');
          }
        } else {
          setHome(response?.data ?? null);
          if (notify) {
            toast.info('Nada por aqui ainda');
          }
        }
      } catch (err) {
        console.error('[aluno/resumo] Falha ao carregar dados', err);
        if (!mountedRef.current) return;
        setError('Erro ao carregar dados.');
        toast.error('Erro ao carregar dados');
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
        setTermLoading(false);
      }
    },
    [selectedTerm],
  );

  useEffect(() => {
    void loadHome({ notify: true });
  }, [loadHome]);

  useEffect(() => {
    if (!home?.announcements?.length) return;
    setAnnouncementIndex(0);
  }, [home?.announcements]);

  useEffect(() => {
    if (!home?.announcements?.length) return;
    if (announcementsPaused) return;
    const id = window.setInterval(() => {
      setAnnouncementIndex((prev) =>
        home.announcements.length ? (prev + 1) % home.announcements.length : 0,
      );
    }, 10_000);
    return () => window.clearInterval(id);
  }, [home?.announcements, announcementsPaused]);

  const scheduleMatrix = useMemo(() => {
    const scheduleEntries = home?.class?.schedule ?? [];
    return groupScheduleEntries(scheduleEntries);
  }, [home?.class?.schedule]);

  const classColor = useMemo(() => {
    if (!home?.class) return { background: '#f97316', textColor: '#0f172a' };
    return getClassColorPair(home.class.id || home.class.name || '');
  }, [home?.class]);

  const announcements = home?.announcements ?? [];
  const agendaItems = home?.agenda ?? [];
  const activities = home?.atividades ?? [];

  const currentAnnouncement =
    announcements.length > 0 ? announcements[announcementIndex % announcements.length] : null;

  const gradePlan = home?.gradePlan ?? null;
  const gradeStats = home?.gradeStats ?? { byTerm: {}, byActivity: {} };
  const termStats = gradeStats.byTerm?.[String(selectedTerm)] ?? { avg: 0, median: 0, n: 0 };
  const activitiesForTerm = gradePlan?.term === selectedTerm ? gradePlan.activities : [];
  const totalPoints = sumPoints(activitiesForTerm);
  const progressPercent = Math.min(100, Math.round((totalPoints / 10) * 100));

  const byActivity = gradeStats.byActivity?.[String(selectedTerm)] ?? [];

  const handleTermChange = useCallback(
    (term: number) => {
      if (term === selectedTerm) return;
      setSelectedTerm(term);
      void loadHome({ term, notify: false });
    },
    [loadHome, selectedTerm],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Carregando dashboard do aluno…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-12 lg:col-span-7">
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Horário semanal</CardTitle>
                <CardSub>Blocos em que sua turma tem aula registrada</CardSub>
              </div>
              {home?.class?.name && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
                  {home.class.name}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[560px] table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="w-28 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Horário
                    </th>
                    {WEEK_DAYS.map((day) => (
                      <th
                        key={day.id}
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {day.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOT_CONFIG.map((slot) => (
                    <tr key={slot.id} className="border-t border-slate-100">
                      <td className="px-3 py-3 align-top text-sm text-slate-600">
                        <div className="font-semibold text-slate-700">{slot.label} horário</div>
                        <div className="text-xs text-slate-500">{slot.time}</div>
                      </td>
                      {WEEK_DAYS.map((day) => {
                        const key = `${slot.id}-${day.id}`;
                        const hasClass = scheduleMatrix.get(key);
                        return (
                          <td key={day.id} className="px-3 py-3">
                            <div
                              className={[
                                'flex min-h-[72px] items-center justify-center rounded-xl border text-sm font-medium transition',
                                hasClass
                                  ? 'border-transparent shadow-sm'
                                  : 'border-dashed border-slate-200 text-slate-400',
                              ].join(' ')}
                              style={
                                hasClass
                                  ? {
                                      background: classColor.background,
                                      color: classColor.textColor,
                                    }
                                  : undefined
                              }
                            >
                              {hasClass ? home?.class?.name ?? 'Aula' : '—'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Avisos</CardTitle>
                <CardSub>Comunicados recentes para sua turma</CardSub>
              </div>
              {announcements.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAnnouncementsModalOpen(true)}
                  className="text-sm font-semibold text-orange-600 transition hover:text-orange-500"
                >
                  Ver todos
                </button>
              )}
            </div>

            {announcements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Nada por aqui ainda
              </div>
            ) : currentAnnouncement ? (
              <div
                className="relative rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm"
                onMouseEnter={() => setAnnouncementsPaused(true)}
                onMouseLeave={() => setAnnouncementsPaused(false)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-semibold text-slate-800">
                      {currentAnnouncement.title ?? 'Aviso'}
                    </h4>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                      {formatRelative(currentAnnouncement.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      onClick={() =>
                        setAnnouncementIndex((prev) =>
                          (prev - 1 + announcements.length) % announcements.length,
                        )
                      }
                      aria-label="Anterior"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      onClick={() =>
                        setAnnouncementIndex((prev) => (prev + 1) % announcements.length)
                      }
                      aria-label="Próximo"
                    >
                      ›
                    </button>
                  </div>
                </div>
                <div
                  className="prose prose-sm mt-3 max-w-none text-slate-700"
                  dangerouslySetInnerHTML={sanitizeHtml(
                    currentAnnouncement.html || currentAnnouncement.message || '',
                  )}
                />
                {currentAnnouncement.attachments?.length ? (
                  <div className="mt-3 space-y-2">
                    {currentAnnouncement.attachments.map((attachment, index) => {
                      if (!attachment.url) return null;
                      const mime = (attachment.mime || '').toLowerCase();
                      if (mime.startsWith('image/')) {
                        return (
                          <div key={`${attachment.url}-${index}`} className="overflow-hidden rounded-lg border border-slate-200">
                            <img
                              src={attachment.url}
                              alt={attachment.name ?? 'Imagem do aviso'}
                              className="max-h-48 w-full object-cover"
                            />
                          </div>
                        );
                      }
                      return (
                        <a
                          key={`${attachment.url}-${index}`}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
                        >
                          {attachment.name ?? 'Abrir anexo'}
                        </a>
                      );
                    })}
                  </div>
                ) : null}
                <div className="mt-4 text-xs uppercase tracking-wide text-slate-400">
                  {announcementIndex + 1} / {announcements.length}
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card className="col-span-12 md:col-span-6">
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Agenda</CardTitle>
                <CardSub>Conteúdos, atividades e datas importantes</CardSub>
              </div>
              {agendaItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAgendaModalOpen(true)}
                  className="text-sm font-semibold text-orange-600 transition hover:text-orange-500"
                >
                  Ver todos
                </button>
              )}
            </div>
            {agendaItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Nada por aqui ainda
              </div>
            ) : (
              <div className="space-y-3">
                {agendaItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.kind === 'ATIVIDADE' ? 'Atividade' : 'Data'}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-800">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDateLong(item.dateISO)}</div>
                    {item.tags?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="col-span-12 md:col-span-6">
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Próximas atividades</CardTitle>
                <CardSub>Conteúdos e avaliações das próximas semanas</CardSub>
              </div>
              {activities.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActivitiesModalOpen(true)}
                  className="text-sm font-semibold text-orange-600 transition hover:text-orange-500"
                >
                  Ver todos
                </button>
              )}
            </div>
            {activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Nada por aqui ainda
              </div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => {
                  const status = activity.status ? STATUS_LABELS[activity.status] : null;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{activity.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDateLong(activity.dateISO)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {status ? (
                          <span
                            className={`rounded-full px-3 py-0.5 text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        ) : null}
                        {activity.term ? (
                          <span className="text-xs text-slate-500">
                            {activity.term}º bimestre
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="col-span-12">
          <CardBody className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Divisão de notas (visual)</CardTitle>
                <CardSub>Plano de atividades avaliativas por bimestre</CardSub>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleTermChange(term)}
                    className="bim-pill"
                    data-active={selectedTerm === term}
                    disabled={termLoading && selectedTerm === term}
                  >
                    {term}º bim.
                  </button>
                ))}
              </div>
            </div>

            {termLoading && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Carregando plano deste bimestre…
              </div>
            )}

            {!termLoading && !gradePlan?.activities.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                Seu professor ainda não cadastrou a divisão de notas deste bimestre.
              </div>
            ) : null}

            {!termLoading && gradePlan?.activities.length ? (
              <>
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Total de pontos cadastrados</span>
                    <span>
                      {totalPoints.toFixed(1)} / 10
                    </span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Atividade</th>
                        <th className="px-4 py-3 text-right">Pontos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradePlan.activities.map((activity) => (
                        <tr key={activity.id}>
                          <td className="px-4 py-3 font-medium text-slate-700">{activity.name}</td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {Number(activity.points ?? 0).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Média da turma
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-800">
                      {termStats.avg.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mediana
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-800">
                      {termStats.median.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lançamentos
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-800">{termStats.n}</p>
                  </div>
                </div>

                {byActivity.length ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-inner">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Média por atividade
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {byActivity.map((item) => (
                        <span
                          key={item.activityId}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm"
                        >
                          {item.avg.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Modal open={announcementsModalOpen} onClose={() => setAnnouncementsModalOpen(false)}>
        <div className="max-h-[70vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800">Todos os avisos da turma</h2>
          <p className="text-sm text-slate-500">Os comunicados ficam disponíveis por ordem de publicação.</p>
          <div className="mt-4 space-y-4">
            {announcements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Nada por aqui ainda
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-800">
                      {announcement.title ?? 'Aviso'}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {formatDateLong(announcement.createdAt)}
                    </span>
                  </div>
                  <div
                    className="prose prose-sm mt-2 max-w-none text-slate-700"
                    dangerouslySetInnerHTML={sanitizeHtml(
                      announcement.html || announcement.message || '',
                    )}
                  />
                  {announcement.attachments?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {announcement.attachments.map((attachment, index) => (
                        <a
                          key={`${attachment.url}-${index}`}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
                        >
                          {attachment.name ?? 'Abrir anexo'}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal open={agendaModalOpen} onClose={() => setAgendaModalOpen(false)}>
        <div className="max-h-[70vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800">Agenda completa</h2>
          <p className="text-sm text-slate-500">
            Consulte conteúdos, atividades e datas importantes cadastradas na turma.
          </p>
          <div className="mt-4 space-y-3">
            {agendaItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Nada por aqui ainda
              </div>
            ) : (
              agendaItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.kind === 'ATIVIDADE' ? 'Atividade' : 'Data'}
                    </div>
                    <div className="text-xs text-slate-500">{formatDateLong(item.dateISO)}</div>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">{item.title}</div>
                  {item.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal open={activitiesModalOpen} onClose={() => setActivitiesModalOpen(false)}>
        <div className="max-h-[70vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800">Próximas atividades</h2>
          <p className="text-sm text-slate-500">Lista completa das atividades previstas para os próximos dias.</p>
          <div className="mt-4 space-y-3">
            {activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Nada por aqui ainda
              </div>
            ) : (
              activities.map((activity) => {
                const status = activity.status ? STATUS_LABELS[activity.status] : null;
                return (
                  <div key={activity.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{activity.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDateLong(activity.dateISO)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {status ? (
                          <span
                            className={`rounded-full px-3 py-0.5 text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        ) : null}
                        {activity.term ? (
                          <span className="text-xs text-slate-500">
                            {activity.term}º bimestre
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
