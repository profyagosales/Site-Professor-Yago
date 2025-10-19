import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getGradesSummary, type GradeSummaryPoint } from '@/services/gradesSummary';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, index) => CURRENT_YEAR - index);
const BIMESTERS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
const PIE_COLORS = ['#fb923c', '#f97316', '#facc15', '#22c55e'];

type ChartDatum = {
  bimester: number;
  label: string;
  avg: number;
  median: number;
  count: number;
};

function computeMedian(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

type ClassOption = {
  id: string;
  label: string;
};

type MediaGeralBimestreProps = {
  classOptions?: ClassOption[];
};

export default function MediaGeralBimestre({ classOptions = [] }: MediaGeralBimestreProps) {
  const [year, setYear] = useState<number>(YEARS[0]);
  const [selectedBimesters, setSelectedBimesters] = useState<number[]>([1, 2, 3, 4]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [stats, setStats] = useState<GradeSummaryPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!selectedBimesters.length) {
        setStats([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await getGradesSummary({
          year,
          bimesters: selectedBimesters,
          classId: selectedClassId || undefined,
        });
        if (cancelled) return;
        setStats(response.series || []);
      } catch (err) {
        console.error('[MediaGeralBimestre] Falha ao carregar estatísticas', err);
        if (!cancelled) {
          setError('Não foi possível carregar as médias neste momento.');
          setStats([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [year, selectedBimesters, selectedClassId]);

  const chartData: ChartDatum[] = useMemo(() => {
    return stats
      .filter((entry) => Number.isFinite(entry.avg) || Number.isFinite(entry.median))
      .sort((a, b) => a.bimester - b.bimester)
      .map((entry) => ({
        bimester: entry.bimester,
        label: `${entry.bimester}º bim.`,
        avg: Number(entry.avg.toFixed(2)),
        median: Number(entry.median.toFixed(2)),
        count: entry.count,
      }));
  }, [stats]);

  const { pieData, totalCount } = useMemo(() => {
    const total = chartData.reduce((sum, item) => sum + (Number.isFinite(item.count) ? item.count : 0), 0);
    const data = chartData.map((item) => ({
      name: item.label,
      value: Number.isFinite(item.count) ? item.count : 0,
    }));
    return { pieData: data, totalCount: total };
  }, [chartData]);

  const kpis = useMemo(() => {
    const averages = stats.map((entry) => entry.avg).filter((value) => Number.isFinite(value));
    const medians = stats.map((entry) => entry.median).filter((value) => Number.isFinite(value));
    const totalStudents = stats.reduce(
      (sum, entry) => sum + (Number.isFinite(entry.count) ? entry.count : 0),
      0
    );

    const media = averages.length
      ? Number((averages.reduce((acc, value) => acc + value, 0) / averages.length).toFixed(2))
      : 0;
    const mediana = medians.length ? Number(computeMedian(medians).toFixed(2)) : 0;

    return {
      media,
      mediana,
      totalStudents,
    };
  }, [stats]);

  const handleToggleBimester = (bimester: number, checked: boolean) => {
    setSelectedBimesters((current) => {
      if (checked) {
        return Array.from(new Set([...current, bimester])).sort((a, b) => a - b);
      }
      return current.filter((value) => value !== bimester);
    });
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="card-title text-slate-900">Médias</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">
            Ano
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {YEARS.map((optionYear) => (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Turma
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="">Todas</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {BIMESTERS.map((bimester) => (
              <label key={bimester} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedBimesters.includes(bimester)}
                  onChange={(event) => handleToggleBimester(bimester, event.target.checked)}
                />
                {bimester}º
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Kpi label="Média geral" value={kpis.media} icon="📊" />
        <Kpi label="Mediana" value={kpis.mediana} icon="📈" />
        <Kpi label="Avaliações consideradas" value={kpis.totalStudents} decimals={0} icon="👥" />
      </div>

      <div className="mt-6 h-72 w-full">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
        ) : error ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            {selectedBimesters.length === 0
              ? 'Selecione ao menos um bimestre para visualizar.'
              : 'Sem dados para os filtros selecionados.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 10]} allowDecimals width={36} />
              <Tooltip
                formatter={(value: string | number, name) => {
                  if (typeof value === 'number' && Number.isFinite(value)) {
                    return [value.toFixed(1), name === 'avg' ? 'Média' : name === 'median' ? 'Mediana' : name];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="avg" name="Média" fill="#fb923c" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="median" name="Mediana" stroke="#1f2937" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && !error && chartData.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Tooltip formatter={(value: number) => [`${value}`, 'Quantidade']} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`pie-${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col justify-center gap-2 text-sm text-slate-600">
            {totalCount > 0 ? (
              pieData.map((item, index) => (
                <div key={`pie-legend-${item.name}-${index}`} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="text-xs text-slate-500">
                    {item.value} avaliações
                    {totalCount ? ` (${((item.value / totalCount) * 100).toFixed(1)}%)` : ''}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nenhuma avaliação contabilizada no período.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  decimals = 1,
  icon,
}: {
  label: string;
  value: number;
  decimals?: number;
  icon?: string;
}) {
  const display = Number.isFinite(value) ? value.toFixed(decimals) : '—';
  return (
    <div className="rounded-xl border border-slate-100 px-4 py-3 shadow-sm">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        {icon ? <span className="text-base leading-none">{icon}</span> : null}
        <span>{label}</span>
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{display}</p>
    </div>
  );
}
