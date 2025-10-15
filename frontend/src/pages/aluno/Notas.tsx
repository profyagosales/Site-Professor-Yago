import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import type { StudentLayoutContextValue } from '@/layouts/StudentLayout';
import { getStudentGrades } from '@/services/student';

const BIMESTERS = [1, 2, 3, 4] as const;
const DATE_SHORT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

type GradeActivity = {
  atividade: string;
  nota: number | null;
  valor: number | null;
  data: string | null;
};

type GradeSummary = {
  atividades: GradeActivity[];
  agregados: {
    mediaAtividades: number | null;
    pontuacaoAcumulada: number;
    totalAtividades: number;
    resumoPorBimestre: Array<{
      bimester: number;
      pontuacao: number;
      media: number | null;
    }>;
  };
};

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

function resolveClassLabel(profile: StudentLayoutContextValue['profile']): string {
  if (!profile) return 'turma não informada';
  return profile.className ?? 'turma não informada';
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function StudentGradesPage() {
  const { profile, metrics } = useOutletContext<StudentLayoutContextValue>();
  const studentId = profile?.id ?? null;

  const [term, setTerm] = useState<number>(currentBimester());
  const [grades, setGrades] = useState<GradeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const response = await getStudentGrades(studentId, term);
        if (cancelled) return;
        setGrades(response as GradeSummary);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[aluno/notas] Falha ao carregar notas', err);
        const status = Number(err?.response?.status ?? 0);
        if (status >= 500) {
          toast.error('Erro inesperado ao carregar notas.');
        }
        setError(status === 403 ? 'Você não tem acesso a este conteúdo.' : 'Não foi possível carregar as notas deste bimestre.');
        setGrades(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [studentId, term]);

  const agregados = grades?.agregados ?? {
    mediaAtividades: null,
    pontuacaoAcumulada: 0,
    totalAtividades: 0,
    resumoPorBimestre: [],
  };

  const atividades = grades?.atividades ?? [];
  const sortedActivities = useMemo(() => {
    return [...atividades].sort((a, b) => {
      const da = a.data ? new Date(a.data).getTime() : -Infinity;
      const db = b.data ? new Date(b.data).getTime() : -Infinity;
      return db - da;
    });
  }, [atividades]);

  const pontuacaoBimestre = Number(agregados.pontuacaoAcumulada ?? 0);
  const mediaAtividades = agregados.mediaAtividades;
  const totalAtividades = Number(agregados.totalAtividades ?? sortedActivities.filter((item) => item.nota !== null).length);
  const resumoPorBimestre = Array.isArray(agregados.resumoPorBimestre)
    ? agregados.resumoPorBimestre.sort((a, b) => a.bimester - b.bimester)
    : [];

  const pontuacaoAnualBase = resumoPorBimestre.reduce((sum, item) => sum + (item.pontuacao ?? 0), 0);
  const pontuacaoTotalAnual = metrics.totalScore !== null ? metrics.totalScore : pontuacaoAnualBase;

  const headerSubtitle = profile
    ? `Acompanhamento por bimestre — ${resolveClassLabel(profile)}`
    : 'Acompanhamento por bimestre';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-800">Minhas notas</h1>
        <p className="text-sm text-slate-500">{headerSubtitle}</p>
      </header>

      {!studentId ? (
        <EmptyState message="Não foi possível carregar seu perfil de aluno." />
      ) : (
        <Card>
          <CardBody className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Selecione o bimestre</CardTitle>
                <CardSub>As notas exibidas mudam conforme o período escolhido</CardSub>
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

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
                Carregando notas…
              </div>
            ) : error ? (
              <EmptyState message={error} />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-4">
                  <StatCard
                    label="Pontuação do bimestre"
                    value={pontuacaoBimestre.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    hint="Soma das notas lançadas"
                  />
                  <StatCard
                    label="Média das atividades"
                    value={
                      mediaAtividades !== null
                        ? mediaAtividades.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                        : '—'
                    }
                    hint="Calculada com base nas avaliações registradas"
                  />
                  <StatCard
                    label="Atividades avaliadas"
                    value={String(totalAtividades)}
                    hint="Quantidade de notas neste bimestre"
                  />
                  <StatCard
                    label="Pontuação total no ano"
                    value={pontuacaoTotalAnual.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    hint="Soma acumulada de todos os bimestres"
                  />
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
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
                        sortedActivities.map((activity, index) => (
                          <tr key={`${activity.atividade}-${index}`}>
                            <td className="px-4 py-3 font-medium text-slate-700">{activity.atividade}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {typeof activity.nota === 'number'
                                ? activity.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {typeof activity.valor === 'number'
                                ? activity.valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{formatDate(activity.data)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                            Nenhuma nota lançada para o bimestre selecionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pontuação por bimestre</p>
                  {resumoPorBimestre.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {resumoPorBimestre.map((item) => (
                        <div
                          key={item.bimester}
                          className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{item.bimester}º bimestre</p>
                            <p className="text-xs text-slate-500">
                              {item.media !== null
                                ? `Média ${item.media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
                                : 'Sem média registrada'}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-orange-500">
                            {item.pontuacao.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Os bimestres aparecerão aqui assim que houver notas registradas.
                    </p>
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
