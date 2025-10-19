import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import type { StudentLayoutContextValue } from '@/layouts/StudentLayout';
import { getMyGrades, getHome } from '@/services/student';
import { getClassColorPair } from '@/lib/colors';

type GradePlanTerms = Record<string, Array<{ id: string; name: string; points: number }>>;

type MyGradesData = {
  gradePlan: {
    terms: GradePlanTerms;
    year: number;
  } | null;
  scores: Array<{ term: number; activityId: string; score: number }>;
  totals: Record<string, number>;
  totalYear: number;
};

type GradeStats = {
  byTerm: Record<string, { avg: number; median: number; n: number }>;
  byActivity: Record<string, Array<{ activityId: string; avg: number; n?: number }>>;
};

type StudentHomeResponse = {
  success: boolean;
  data: {
    gradeStats: GradeStats;
  };
};

const BIMESTERS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
const PIE_COLORS = ['#f97316', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#c084fc', '#f472b6'];

function currentBimester(): number {
  const month = new Date().getMonth();
  const estimate = Math.floor(month / 3) + 1;
  if (estimate < 1) return 1;
  if (estimate > 4) return 4;
  return estimate;
}

function buildYearOptions(baseYear: number | null | undefined) {
  const currentYear = new Date().getFullYear();
  const start = Number.isFinite(baseYear) ? Number(baseYear) : currentYear;
  return Array.from({ length: 4 }, (_, index) => start - index);
}

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function MinhasNotasPage() {
  const { profile } = useOutletContext<StudentLayoutContextValue>();
  const classId = profile?.classId ?? null;

  const yearOptions = useMemo(() => buildYearOptions(profile?.classYear), [profile?.classYear]);
  const [selectedYear, setSelectedYear] = useState<number>(yearOptions[0] ?? new Date().getFullYear());
  const [selectedTerm, setSelectedTerm] = useState<number>(currentBimester());

  const [myGrades, setMyGrades] = useState<MyGradesData | null>(null);
  const [stats, setStats] = useState<GradeStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadGrades = useCallback(
    async (year: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = (await getMyGrades({
          classId: classId ?? undefined,
          year,
        })) as { success: boolean; data: MyGradesData };

        if (!mountedRef.current) return;

        if (response?.success) {
          setMyGrades(response.data);
          toast.success('Carregado');
        } else {
          setMyGrades(response?.data ?? null);
          toast.info('Nada por aqui ainda');
        }
      } catch (err) {
        console.error('[aluno/notas] Falha ao carregar notas', err);
        if (!mountedRef.current) return;
        setError('Não foi possível carregar suas notas.');
        toast.error('Erro ao carregar dados');
        setMyGrades(null);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [classId],
  );

  const loadStats = useCallback(
    async (term: number, year: number) => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const response = (await getHome({
          term,
          year,
        })) as StudentHomeResponse;

        if (!mountedRef.current) return;
        if (response?.success) {
          setStats(response.data?.gradeStats ?? null);
        } else {
          setStats(response?.data?.gradeStats ?? null);
        }
      } catch (err) {
        console.error('[aluno/notas] Falha ao carregar estatísticas de turma', err);
        if (!mountedRef.current) return;
        setStatsError('Não foi possível carregar as médias da turma.');
        setStats(null);
      } finally {
        if (mountedRef.current) {
          setStatsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadGrades(selectedYear);
  }, [loadGrades, selectedYear]);

  useEffect(() => {
    void loadStats(selectedTerm, selectedYear);
  }, [loadStats, selectedTerm, selectedYear]);

  const planTerms = myGrades?.gradePlan?.terms ?? {};
  const termKey = String(selectedTerm);
  const planActivities = Array.isArray((planTerms as Record<string, unknown>)[termKey])
    ? (planTerms as GradePlanTerms)[termKey]
    : [];

  const scoresByActivity = useMemo(() => {
    const map = new Map<string, number>();
    (myGrades?.scores ?? []).forEach((entry) => {
      if (entry.term === selectedTerm) {
        map.set(entry.activityId, Number(entry.score ?? 0));
      }
    });
    return map;
  }, [myGrades?.scores, selectedTerm]);

  const tableRows = planActivities.map((activity) => ({
    id: activity.id,
    name: activity.name,
    score: Number(scoresByActivity.get(activity.id) ?? 0),
    points: Number(activity.points ?? 0),
  }));

  const totalTerm = Number(myGrades?.totals?.[termKey] ?? 0);
  const totalYear = Number(myGrades?.totalYear ?? 0);
  const missingForYear = Math.max(0, Number((20 - totalYear).toFixed(2)));
  const missingForTerm = Math.max(0, Number((5 - totalTerm).toFixed(2)));

  const classColor = useMemo(() => {
    const identifier = profile?.classId || profile?.className || '';
    return getClassColorPair(identifier);
  }, [profile?.classId, profile?.className]);

  const statsForTerm = stats?.byTerm?.[termKey] ?? { avg: 0, median: 0, n: 0 };

  const pieActivityData = useMemo(() => {
    const activityStats = stats?.byActivity?.[termKey] ?? [];
    return activityStats
      .map((item) => {
        const activity = planActivities.find((act) => act.id === item.activityId);
        return {
          name: activity?.name ?? 'Atividade',
          value: Number(item.avg ?? 0),
        };
      })
      .filter((item) => Number.isFinite(item.value) && item.value > 0);
  }, [planActivities, stats?.byActivity, termKey]);

  const averagePieData = useMemo(() => {
    const avg = Number(statsForTerm.avg ?? 0);
    if (!Number.isFinite(avg) || avg <= 0) return [];
    const remaining = Math.max(0, Number((10 - avg).toFixed(2)));
    return [
      { name: 'Média', value: avg },
      { name: 'Restante até 10', value: remaining },
    ];
  }, [statsForTerm.avg]);

  const badgeClass =
    totalTerm >= 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';

  const handleChangeYear = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextYear = Number(event.target.value);
    setSelectedYear(nextYear);
  };

  const handleSelectTerm = (term: number) => {
    if (term === selectedTerm) return;
    setSelectedTerm(term);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Carregando suas notas…
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
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Minhas notas</h1>
          <p className="text-sm text-slate-500">
            Acompanhe seu desempenho por bimestre e compare com a média da turma.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">
            Ano letivo
            <select
              value={selectedYear}
              onChange={handleChangeYear}
              className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {BIMESTERS.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => handleSelectTerm(term)}
            className={[
              'rounded-full px-3 py-1 text-sm font-semibold transition',
              selectedTerm === term
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            {term}º bimestre
          </button>
        ))}
      </div>

      {(!myGrades?.gradePlan || !planActivities.length) && (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          Seu professor ainda não cadastrou a divisão de notas deste bimestre.
        </div>
      )}

      {planActivities.length ? (
        <div className="grid grid-cols-12 gap-6">
          <Card className="col-span-12 lg:col-span-7">
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Minhas notas do bimestre</CardTitle>
                  <CardSub>Notas lançadas em cada atividade avaliativa</CardSub>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                  Total do bimestre: {formatNumber(totalTerm)}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Atividade</th>
                      <th className="px-4 py-3 text-right">Nota obtida</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-medium text-slate-700">{row.name}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatNumber(row.score)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {formatNumber(row.points)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-12 lg:col-span-5">
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>Médias da turma</CardTitle>
                  <CardSub>Comparativo do seu bimestre com a turma</CardSub>
                </div>
              </div>

              {statsLoading ? (
                <div className="h-48 w-full animate-pulse rounded-2xl bg-slate-100" />
              ) : statsError ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  {statsError}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-4">
                    <h4 className="text-sm font-semibold text-slate-700">Média por atividade</h4>
                    {pieActivityData.length ? (
                      <div className="h-40 w-full">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={pieActivityData}
                              dataKey="value"
                              innerRadius={30}
                              outerRadius={55}
                              paddingAngle={2}
                            >
                              {pieActivityData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatNumber(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Ainda sem dados suficientes.</p>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-4">
                    <h4 className="text-sm font-semibold text-slate-700">Média global</h4>
                    {averagePieData.length ? (
                      <div className="h-40 w-full">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={averagePieData}
                              dataKey="value"
                              innerRadius={30}
                              outerRadius={55}
                              paddingAngle={2}
                            >
                              {averagePieData.map((_, index) => (
                                <Cell
                                  key={`avg-cell-${index}`}
                                  fill={index === 0 ? classColor.background : '#e2e8f0'}
                                  stroke={index === 0 ? classColor.background : '#e2e8f0'}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatNumber(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Ainda sem dados suficientes.</p>
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total anual ({selectedYear})
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(totalYear)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quanto falta para 20 pontos
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">
            {formatNumber(missingForYear)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quanto falta para 5 no bimestre
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">
            {totalTerm >= 5 ? 'Meta alcançada 🎉' : formatNumber(missingForTerm)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {totalTerm >= 5
              ? 'Parabéns, você já alcançou a nota mínima deste bimestre.'
              : 'Faltam estes pontos para atingir a média 5.'}
          </p>
        </div>
      </div>
    </div>
  );
}
