import { useEffect, useMemo, useState } from 'react';
import { Page } from '@/components/Page';
import { Tabs } from '@/components/ui/Tabs';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import { useAuth } from '@/store/AuthContext';
import { getStudentProfile, listStudentEssays } from '@/services/student';
import { toast } from 'react-toastify';

type StudentProfile = {
  id: string;
  name?: string | null;
  className?: string | null;
  class?: Record<string, unknown> | null;
  series?: number | null;
  letter?: string | null;
  discipline?: string | null;
};

type StudentEssay = {
  id: string;
  type: string;
  bimester?: number | null;
  submittedAt?: string | null;
  rawScore?: number | null;
  status?: string | null;
  originalUrl?: string | null;
  correctedUrl?: string | null;
  customTheme?: string | null;
  themeName?: string | null;
};

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
    id,
    name: base.name ?? base.nome ?? null,
    className,
    class: classInfo && typeof classInfo === 'object' ? classInfo : null,
    series: series ?? null,
    letter: letter ?? null,
    discipline: discipline ?? null,
  };
}

function normalizeEssays(raw: unknown): StudentEssay[] {
  const list = unwrapData<unknown[]>(raw);
  if (!Array.isArray(list)) return [];
  const mapped: Array<StudentEssay | null> = list.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const entry = item as Record<string, unknown>;
    const essay: StudentEssay = {
      id: normalizeId(entry),
      type: String(entry.type ?? 'ENEM'),
      bimester: typeof entry.bimester === 'number' ? entry.bimester : entry.bimester ? Number(entry.bimester) : null,
      submittedAt: (entry.submittedAt as string) ?? (entry.createdAt as string) ?? null,
      rawScore: typeof entry.rawScore === 'number' ? entry.rawScore : entry.rawScore ? Number(entry.rawScore) : null,
      status: (entry.status as string) ?? null,
      originalUrl: (entry.originalUrl as string) ?? null,
      correctedUrl: (entry.correctedUrl as string) ?? null,
      customTheme: (entry.customTheme as string) ?? null,
      themeName:
        typeof (entry.theme as any)?.name === 'string'
          ? (entry.theme as any).name
          : typeof entry.themeName === 'string'
            ? (entry.themeName as string)
            : null,
    };
    return essay.id ? essay : null;
  });
  return mapped.filter((item): item is StudentEssay => item !== null);
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

const DATE_FULL = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(value?: string | null, fallback = '—') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return DATE_FULL.format(date);
}

function formatType(value: string) {
  if (!value) return '—';
  const upper = value.toUpperCase();
  if (upper === 'ENEM') return 'ENEM';
  if (upper === 'PAS') return 'PAS/UnB';
  return upper;
}

function formatStatus(value?: string | null) {
  if (!value) return 'Em análise';
  const upper = value.toUpperCase();
  if (upper === 'GRADED') return 'Corrigida';
  if (upper === 'PENDING') return 'Em correção';
  return value;
}

export default function AlunoRedacoes() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [essays, setEssays] = useState<StudentEssay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const rawProfile = await getStudentProfile();
        if (cancelled) return;
        const normalized = normalizeProfile(rawProfile);
        if (!normalized || !normalized.id) {
          throw new Error('Perfil indisponível');
        }
        setProfile(normalized);
        setStudentId(normalized.id);
      } catch (error) {
        console.error('Erro ao carregar perfil', error);
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
    const loadEssays = async () => {
      try {
        const data = await listStudentEssays(studentId);
        if (cancelled) return;
        setEssays(normalizeEssays(data));
      } catch (error) {
        console.error('Erro ao carregar redações', error);
        if (!cancelled) {
          toast.error('Não foi possível carregar suas redações');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadEssays();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const sortedEssays = useMemo(() => {
    const list = [...essays];
    return list.sort((a, b) => {
      const da = a.submittedAt ? new Date(a.submittedAt).getTime() : -Infinity;
      const db = b.submittedAt ? new Date(b.submittedAt).getTime() : -Infinity;
      return db - da;
    });
  }, [essays]);

  const graded = useMemo(() => essays.filter((essay) => essay.status?.toUpperCase() === 'GRADED').length, [essays]);

  return (
    <Page
      title="Minhas redações"
      subtitle={
        profile
          ? `Acompanhe o status das entregas — ${resolveClassLabel(profile) || 'turma não informada'}`
          : undefined
      }
    >
      <div className="mb-8">
        <Tabs
          items={[
            { key: 'overview', label: 'Resumo', to: '/aluno/resumo' },
            { key: 'grades', label: 'Minhas Notas', to: '/aluno/notas' },
            { key: 'essays', label: 'Redações', to: '/aluno/redacoes', end: true },
            { key: 'pas', label: 'PAS/UnB', to: '/aluno/pas-unb' },
          ]}
        />
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Histórico de redações</CardTitle>
              <CardSub>Veja o andamento das correções e acesse os arquivos enviados</CardSub>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Corrigidas</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{graded}</p>
              <p className="text-xs text-slate-400">de {essays.length} enviadas</p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">Carregando redações…</div>
          ) : sortedEssays.length ? (
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tema</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Bimestre</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Nota</th>
                    <th className="px-4 py-3">Enviada em</th>
                    <th className="px-4 py-3">Arquivos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedEssays.map((essay) => (
                    <tr key={essay.id}>
                      <td className="px-4 py-3 font-medium text-ys-ink">{essay.customTheme ?? essay.themeName ?? '—'}</td>
                      <td className="px-4 py-3 text-ys-ink-2">{formatType(essay.type)}</td>
                      <td className="px-4 py-3 text-ys-ink-2">{essay.bimester ? `${essay.bimester}º` : '—'}</td>
                      <td className="px-4 py-3 text-ys-ink-2">{formatStatus(essay.status)}</td>
                      <td className="px-4 py-3 text-ys-ink-2">{essay.rawScore ?? '—'}</td>
                      <td className="px-4 py-3 text-ys-ink-2">{formatDate(essay.submittedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          {essay.originalUrl && (
                            <a
                              href={essay.originalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-200 px-3 py-1 text-ys-ink transition hover:border-orange-300 hover:text-orange-600"
                            >
                              Versão enviada
                            </a>
                          )}
                          {essay.correctedUrl && (
                            <a
                              href={essay.correctedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-200 px-3 py-1 text-ys-ink transition hover:border-orange-300 hover:text-orange-600"
                            >
                              Correção
                            </a>
                          )}
                          {!essay.originalUrl && !essay.correctedUrl && <span className="text-ys-ink-2">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
              Nenhuma redação enviada até o momento.
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

