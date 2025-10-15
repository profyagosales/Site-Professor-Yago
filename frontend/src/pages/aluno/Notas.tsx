import { useEffect, useMemo, useState } from 'react';
import { Page } from '@/components/Page';
import { Tabs } from '@/components/ui/Tabs';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import { useAuth } from '@/store/AuthContext';
import { getStudentProfile, getStudentGrades } from '@/services/student';
import { toast } from 'react-toastify';

type StudentProfile = {
  id: string;
  name?: string | null;
  className?: string | null;
  email?: string | null;
  class?: Record<string, unknown> | null;
  series?: number | null;
  letter?: string | null;
  discipline?: string | null;
  [key: string]: unknown;
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

const BIMESTERS = [1, 2, 3, 4] as const;
const DATE_SHORT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

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
    className,
    class: classInfo && typeof classInfo === 'object' ? classInfo : null,
    series: series ?? null,
    letter: letter ?? null,
    discipline: discipline ?? null,
  };
}

function normalizeGrades(raw: unknown): StudentGrades {
  const value = unwrapData<any>(raw) ?? {};
  const activities = Array.isArray(value.activities) ? (value.activities as unknown[]) : [];
  const mapped: Array<StudentGradeActivity | null> = activities.map((item) => {
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
  });
  return {
    activities: mapped.filter((item): item is StudentGradeActivity => item !== null),
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

export default function AlunoNotas() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [term, setTerm] = useState<number>(currentBimester());
  const [grades, setGrades] = useState<StudentGrades>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const rawProfile = await getStudentProfile();
        if (cancelled) return;
        const normalized = normalizeProfile(rawProfile);
        if (!normalized || !normalized.id) {
          throw new Error('Perfil do aluno indisponível');
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
    setLoading(true);
    const loadGrades = async () => {
      try {
        const data = await getStudentGrades(studentId, term);
        if (cancelled) return;
        setGrades(normalizeGrades(data));
      } catch (error) {
        console.error('Erro ao carregar notas do aluno', error);
        if (!cancelled) {
          toast.error('Não foi possível carregar as notas do bimestre selecionado');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadGrades();
    return () => {
      cancelled = true;
    };
  }, [studentId, term]);

  const totalPoints = useMemo(() => {
    const activitySum = (grades.activities ?? []).reduce((sum, activity) => sum + (activity.score ?? 0), 0);
    return activitySum + (grades.notebookScore ?? 0);
  }, [grades]);

  const averageScore = useMemo(() => {
    const entries = grades.activities ?? [];
    if (!entries.length) return null;
    const valid = entries.filter((activity) => typeof activity.score === 'number');
    if (!valid.length) return null;
    const sum = valid.reduce((acc, activity) => acc + (activity.score ?? 0), 0);
    return sum / valid.length;
  }, [grades.activities]);

  const sortedActivities = useMemo(() => {
    const entries = [...(grades.activities ?? [])];
    return entries.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : -Infinity;
      const db = b.date ? new Date(b.date).getTime() : -Infinity;
      return db - da;
    });
  }, [grades.activities]);

  return (
    <Page
      title="Minhas notas"
      subtitle={profile ? `Acompanhamento por bimestre — ${resolveClassLabel(profile) || 'turma não informada'}` : undefined}
    >
      <div className="mb-8">
        <Tabs
          items={[
            { key: 'overview', label: 'Resumo', to: '/aluno/resumo' },
            { key: 'grades', label: 'Minhas Notas', to: '/aluno/notas', end: true },
            { key: 'essays', label: 'Redações', to: '/aluno/redacoes' },
            { key: 'pas', label: 'PAS/UnB', to: '/pas' },
          ]}
        />
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Selecione o bimestre</CardTitle>
              <CardSub>As notas exibidas abaixo mudam conforme o período escolhido</CardSub>
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

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-orange-200 bg-orange-50/80 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Pontuação acumulada</p>
              <p className="mt-1 text-3xl font-bold text-orange-700">{totalPoints.toFixed(1)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Média das atividades</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{averageScore ? averageScore.toFixed(1) : '—'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Atividades registradas</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{sortedActivities.length}</p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">Carregando notas…</div>
          ) : (
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Atividade</th>
                    <th className="px-4 py-3">Nota</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedActivities.length ? (
                    sortedActivities.map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-4 py-3 font-medium text-ys-ink">{activity.title}</td>
                        <td className="px-4 py-3 text-ys-ink-2">{activity.score ?? '—'}</td>
                        <td className="px-4 py-3 text-ys-ink-2">{activity.weight ?? '—'}</td>
                        <td className="px-4 py-3 text-ys-ink-2">{formatDate(activity.date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                        Nenhuma nota lançada para o bimestre selecionado.
                      </td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-semibold text-ys-ink">
                    <td className="px-4 py-3">Caderno</td>
                    <td className="px-4 py-3">—</td>
                    <td className="px-4 py-3">{grades.notebookScore ?? '—'}</td>
                    <td className="px-4 py-3">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mt-8 flex items-center justify-end text-xs text-slate-400">
        <button
          type="button"
          onClick={() => {
            void logout({ redirect: true, location: '/login-aluno' });
          }}
          className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-500 transition hover:border-orange-300 hover:text-orange-600"
        >
          Encerrar sessão
        </button>
      </div>
    </Page>
  );
}

