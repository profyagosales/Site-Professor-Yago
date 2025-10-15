import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from 'recharts';
import { getTeacherTermAverages, type Term, type TermAverage } from '@/services/teacherMetrics';

const YEARS = Array.from({ length: 3 }, (_, index) => new Date().getFullYear() - index);
const DEFAULT_TERMS: Term[] = [1, 2, 3, 4];

type ChartDatum = {
  term: Term;
  label: string;
  avg: number;
  count: number;
};

export default function MediaGeralBimestreCard() {
  const [ano, setAno] = useState<number>(YEARS[0]);
  const [terms, setTerms] = useState<Term[]>(DEFAULT_TERMS);
  const [data, setData] = useState<TermAverage[]>([]);
  const [students, setStudents] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await getTeacherTermAverages({ year: ano, terms: DEFAULT_TERMS });
        if (cancelled) return;
        setData(response.items);
        setStudents(response.students);
      } catch (err) {
        console.error('Falha ao carregar médias gerais por bimestre', err);
        if (!cancelled) {
          setError('Não foi possível carregar as médias neste momento.');
          setData([]);
          setStudents(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ano]);

  const selected = useMemo(() => {
    return data
      .filter((item) => terms.includes(item.term))
      .sort((a, b) => a.term - b.term);
  }, [data, terms]);

  const chartData: ChartDatum[] = useMemo(
    () =>
      selected
        .filter((item) => Number.isFinite(item.avg))
        .map((item) => ({
          term: item.term,
          label: `${item.term}º bim.`,
          avg: Number(item.avg.toFixed(2)),
          count: item.count,
        })),
    [selected]
  );

  const kpis = useMemo(() => {
    const values = selected.map((entry) => entry.avg).filter((value) => Number.isFinite(value));
    if (!values.length) {
      return { media: 0, mediana: 0 };
    }

    const media = values.reduce((acc, value) => acc + value, 0) / values.length;
    const ordered = [...values].sort((a, b) => a - b);
    const midIndex = Math.floor(ordered.length / 2);
    const mediana =
      ordered.length % 2 === 1
        ? ordered[midIndex]
        : (ordered[midIndex - 1] + ordered[midIndex]) / 2;

    return { media, mediana };
  }, [selected]);

  const toggleTerm = (term: Term, enabled: boolean) => {
    setTerms((current) => {
      if (enabled) {
        return Array.from(new Set([...current, term])).sort((a, b) => a - b) as Term[];
      }
      return current.filter((item) => item !== term);
    });
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-lg font-semibold text-slate-700">Média geral por bimestre</h3>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">
            Ano
            <select
              value={ano}
              onChange={(event) => setAno(Number(event.target.value))}
              className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4].map((term) => (
              <label key={term} className="inline-flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={terms.includes(term as Term)}
                  onChange={(event) => toggleTerm(term as Term, event.target.checked)}
                />
                {term}º bim.
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Kpi label="Média geral" value={kpis.media} />
        <Kpi label="Mediana" value={kpis.mediana} />
        <Kpi label="Alunos considerados" value={students} decimals={0} />
      </div>

      <div className="mt-6 h-72 w-full">
        {loading ? (
          <div className="h-full rounded-xl bg-slate-100 animate-pulse" />
        ) : error ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Sem dados para os filtros selecionados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 10]} />
              <Tooltip
                formatter={(value: string | number) =>
                  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : value
                }
                labelFormatter={(label: string | number) => String(label)}
              />
              <Bar dataKey="avg" name="Média" fill="#fb923c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, decimals = 1 }: { label: string; value: number; decimals?: number }) {
  const display = Number.isFinite(value) ? value.toFixed(decimals) : '—';
  return (
    <div className="rounded-xl border border-slate-100 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{display}</p>
    </div>
  );
}
