import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudentProfile, getStudentYearSummary, listStudentUpcomingExams } from '@/services/student';

export type StudentLayoutProfile = {
  id: string;
  name: string | null;
  email: string | null;
  number: string | null;
  phone: string | null;
  photoUrl: string | null;
  classId: string | null;
  className: string | null;
  classYear: number | null;
};

export type StudentLayoutContextValue = {
  profile: StudentLayoutProfile | null;
  loading: boolean;
  reload: () => Promise<void>;
  metrics: StudentHighlights;
};

export type StudentHighlights = {
  loading: boolean;
  totalScore: number | null;
  upcomingCount: number | null;
  nextEvaluationDate: string | null;
  nextEvaluationTitle: string | null;
};

function deriveClassName(turma: any): string | null {
  if (!turma) return null;
  if (typeof turma.nome === 'string' && turma.nome.trim()) return turma.nome.trim();
  const serie = turma.serie ? `${turma.serie}º` : '';
  const letra = turma.letra ? `${turma.letra}` : '';
  const disciplina = turma.disciplina || turma.subject || '';
  const base = [serie, letra].join('').trim();
  const parts = [base ? `Turma ${base}` : null, disciplina].filter(Boolean);
  return parts.join(' • ') || base || disciplina || null;
}

function normalizeProfile(raw: any): StudentLayoutProfile | null {
  if (!raw) return null;
  const source = raw.user ?? raw;
  if (!source) return null;
  const id = source.id ?? source._id ?? raw.id ?? raw._id ?? null;
  if (!id) return null;
  const turma =
    source.turmaAtual ??
    raw.turmaAtual ??
    source.turma ??
    raw.turma ??
    source.class ??
    raw.class ??
    null;
  const metaClassId = raw.classId ?? source.classId ?? null;
  const resolvedClassId = (() => {
    if (metaClassId != null) return String(metaClassId);
    if (turma?.id) return String(turma.id);
    if (turma?._id) return String(turma._id);
    return null;
  })();
  return {
    id: String(id),
    name: source.nome ?? source.name ?? raw.nome ?? raw.name ?? null,
    email: source.email ?? raw.email ?? null,
    photoUrl:
      source.photoUrl ??
      source.photo ??
      raw.photoUrl ??
      raw.photo ??
      null,
    number:
      source.numero != null
        ? String(source.numero)
        : source.rollNumber != null
        ? String(source.rollNumber)
        : raw.numero != null
        ? String(raw.numero)
        : raw.rollNumber != null
        ? String(raw.rollNumber)
        : null,
    phone: source.telefone ?? source.phone ?? raw.telefone ?? raw.phone ?? null,
    classId: resolvedClassId,
    className: deriveClassName(turma),
    classYear: typeof turma?.ano === 'number' ? turma.ano : typeof turma?.year === 'number' ? turma.year : null,
  };
}

const STUDENT_TABS = [
  { label: 'Resumo', to: '/aluno/resumo' },
  { label: 'Minhas Notas', to: '/aluno/notas' },
  { label: 'Redações', to: '/aluno/redacoes' },
  { label: 'PAS/UnB', to: '/pas', variant: 'pas' as const },
];

function deriveInitials(value: string | null | undefined): string {
  if (!value) return 'AL';
  const parts = value.trim().split(/\s+/).slice(0, 2);
  if (!parts.length) return 'AL';
  return parts
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .join('')
    .slice(0, 2) || 'AL';
}

export default function StudentLayout() {
  const { logout, user: sessionUser } = useAuth();
  const [profile, setProfile] = useState<StudentLayoutProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<StudentHighlights>({
    loading: true,
    totalScore: null,
    upcomingCount: null,
    nextEvaluationDate: null,
    nextEvaluationTitle: null,
  });
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setProfileError(null);
    try {
      const data = await getStudentProfile();
      setProfile(normalizeProfile(data));
      setProfileError(null);
    } catch (error) {
      console.error('[student-layout] Falha ao carregar perfil do aluno', error);
      setProfile(null);
      const status = Number((error as any)?.response?.status ?? 0);
      if (status === 401) {
        await logout({ redirect: true, location: '/login-aluno' });
        return;
      }
      if (status === 403) {
        const roleFromResponse = String((error as any)?.response?.data?.role ?? '').toLowerCase();
        const roleFromSession = typeof sessionUser?.role === 'string' ? sessionUser.role.toLowerCase() : null;
        const effectiveRole = roleFromResponse || roleFromSession;
        if (effectiveRole && effectiveRole !== 'student') {
          setProfileError('Acesso negado para este perfil.');
        } else {
          setProfileError('Não foi possível carregar seu perfil de aluno.');
        }
      } else {
        setProfileError('Não foi possível carregar seu perfil de aluno.');
      }
    } finally {
      setLoading(false);
    }
  }, [logout, sessionUser?.role]);

  useEffect(() => {
    if (!profile?.id) {
      setMetrics((prev) => ({
        ...prev,
        loading: false,
        totalScore: null,
        upcomingCount: null,
        nextEvaluationDate: null,
        nextEvaluationTitle: null,
      }));
      return;
    }

    let cancelled = false;
    const year = profile.classYear ?? new Date().getFullYear();

    setMetrics((prev) => ({ ...prev, loading: true }));

    const loadHighlights = async () => {
      try {
        const [summary, upcoming] = await Promise.all([
          getStudentYearSummary(profile.id, year),
          listStudentUpcomingExams(profile.id, { limit: 5, daysAhead: 90 }),
        ]);

        if (cancelled) return;

        const totalScore = Number(summary?.pontuacaoAcumulada ?? summary?.total ?? 0);
        const normalizedUpcoming = Array.isArray(upcoming) ? upcoming : [];
        const nextExam = normalizedUpcoming[0] ?? null;
        const nextDateRaw = nextExam?.date ?? nextExam?.data ?? null;
        const nextTitle = nextExam?.title ?? nextExam?.titulo ?? null;

        setMetrics({
          loading: false,
          totalScore: Number.isFinite(totalScore) ? totalScore : 0,
          upcomingCount: normalizedUpcoming.length,
          nextEvaluationDate: nextDateRaw ?? null,
          nextEvaluationTitle: nextTitle ?? null,
        });
      } catch (error) {
        console.error('[student-layout] Falha ao carregar destaques do aluno', error);
        if (!cancelled) {
          setMetrics({
            loading: false,
            totalScore: null,
            upcomingCount: null,
            nextEvaluationDate: null,
            nextEvaluationTitle: null,
          });
        }
      }
    };

    void loadHighlights();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.classYear]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleLogout = useCallback(() => {
    void logout({ redirect: true, location: '/login-aluno' });
  }, [logout]);

  const contextValue = useMemo<StudentLayoutContextValue>(() => ({
    profile,
    loading,
    reload: loadProfile,
    metrics,
  }), [profile, loading, loadProfile, metrics]);

  const studentName = loading ? 'Carregando…' : profile?.name ?? 'Aluno';
  const classLabel = loading ? 'Carregando turma…' : profile?.className ?? 'Turma não informada';
  const rollNumber = profile?.number ?? '—';
  const email = profile?.email ?? '—';
  const phone = profile?.phone ?? '—';
  const avatarUrl = profile?.photoUrl ?? (sessionUser?.photoUrl as string | undefined) ?? null;
  const avatarInitials = deriveInitials(profile?.name ?? sessionUser?.name ?? null);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="rounded-b-3xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/logo.svg"
                alt="Prof. Yago Sales"
                className="h-14 w-14 rounded-2xl border border-white/30 bg-white/10 p-2 shadow-lg"
              />
            </div>
            <div className="flex flex-1 flex-col items-center gap-4 text-center text-white md:flex-row md:items-center md:text-left">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/30 bg-white/10 shadow-lg">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={studentName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold uppercase tracking-wide text-white/90">
                    {avatarInitials}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center md:items-start">
                <p className="text-sm uppercase tracking-wide text-white/80">OLÁ</p>
                <h1 className="text-2xl font-semibold md:text-3xl">{studentName}</h1>
                <p className="text-sm text-white/90">
                  {classLabel} • Nº {rollNumber} • {email} • {phone}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-orange-500 shadow-sm transition hover:shadow-md"
            >
              Sair
            </button>
          </div>

          <nav className="mt-4 flex flex-wrap justify-center gap-3 md:mt-6">
            {STUDENT_TABS.map((tab) =>
              tab.variant === 'pas' ? (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 bg-gradient-to-r from-[#00c4cc] to-[#3e9d5a] shadow-sm hover:opacity-95"
                >
                  {tab.label}
                </Link>
              ) : (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      isActive
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'bg-white/15 text-white hover:bg-white/25',
                    ].join(' ')
                  }
                >
                  {tab.label}
                </NavLink>
              )
            )}
          </nav>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {profileError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {profileError}
          </div>
        )}
        <Outlet context={contextValue} />
      </main>
    </div>
  );
}
