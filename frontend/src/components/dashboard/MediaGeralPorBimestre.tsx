import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import { getTeacherBimesterAverages, type TeacherAveragePoint } from '@/services/teacherMetrics';

type ClassSummaryLike = {
  id: string;
  year?: number | null;
  series?: number | null;
  letter?: string | null;
  discipline?: string | null;
  name?: string | null;
};

type MediaGeralPorBimestreProps = {
  classes: ClassSummaryLike[];
  classNames: Record<string, string>;
};

type FetchState = 'idle' | 'loading' | 'error' | 'success';

function currentYear(): number {
  return new Date().getFullYear();
}

function formatClassOption(cls: ClassSummaryLike, label: string): string {
  if (label) return label;
  const parts: string[] = [];
  if (cls.series) {
    parts.push(`${cls.series}º`);
  }
  if (cls.letter) {
    parts.push(String(cls.letter).toUpperCase());
  }
  if (cls.discipline) {
    parts.push(cls.discipline);
  }
  return parts.length ? parts.join(' • ') : cls.name ?? cls.id;
}

function SkeletonChart() {
  return (
    <div className="mt-6 flex h-[280px] w-full items-center justify-center rounded-2xl bg-slate-100/70">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-6 flex h-[280px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
      {message}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export function MediaGeralPorBimestre({ classes, classNames }: MediaGeralPorBimestreProps) {
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    classes.forEach((cls) => {
      if (typeof cls.year === 'number' && Number.isFinite(cls.year)) {
        set.add(cls.year);
      }
    });
    const list = Array.from(set).sort((a, b) => b - a);
    if (!list.length) {
      list.push(currentYear());
    }
    return list;
  }, [classes]);

  const [year, setYear] = useState(() => availableYears[0] ?? currentYear());
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [data, setData] = useState<TeacherAveragePoint[]>([]);
  const [status, setStatus] = useState<FetchState>('idle');

  useEffect(() => {
    if (!availableYears.includes(year)) {
      setYear(availableYears[0] ?? currentYear());
    }
  }, [availableYears, year]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setStatus('loading');
      try {
        const response = await getTeacherBimesterAverages({ ano: year, turmas: selectedClasses });
        if (cancelled) return;
        setData(Array.isArray(response) ? response : []);
        setStatus('success');
      } catch (error) {
        console.error('Falha ao carregar médias gerais por bimestre', error);
        if (!cancelled) {
          setStatus('error');
          setData([]);
        }
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [year, selectedClasses]);

  const classOptions = useMemo(() => {
    return classes.map((cls) => ({
      id: cls.id,
      label: formatClassOption(cls, classNames[cls.id]),
    }));
  }, [classes, classNames]);

  const stats = useMemo(() => {
    const total = data.reduce((acc, item) => acc + (Number.isFinite(item.media) ? 1 : 0), 0);
    const best = data.reduce((max, item) => (item.media > max ? item.media : max), 0);
    const overall = data.reduce((sum, item) => sum + (Number.isFinite(item.media) ? item.media : 0), 0);
    const average = total ? overall / total : null;
    return {
      total,
      best,
      average,
    };
  }, [data]);

  const chartData = useMemo(
    () =>
      data
        .map((item) => ({
          bim: item.bim,
          label: `${item.bim}º bim.`,
          media: Number.isFinite(item.media) ? Number(item.media.toFixed(2)) : null,
        }))
        .filter((item) => item.media !== null),
    [data]
  );

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      setYear(value);
    }
  };

  const handleClassesChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions).map((opt) => opt.value);
    setSelectedClasses(values);
  };

  return (
    <Card className="border-ys-line bg-white shadow-sm">
      <CardBody>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Média geral por bimestre</CardTitle>
            <CardSub>Comparativo dos bimestres por turma selecionada</CardSub>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>Ano</span>
              <select
                value={year}
                onChange={handleYearChange}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              >
                {availableYears.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm text-slate-600">
              <span className="mb-1">Turmas</span>
              <select
                multiple
                value={selectedClasses}
                onChange={handleClassesChange}
                className="h-24 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              >
                {classOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 text-xs text-slate-400">Selecione nenhuma para considerar todas</span>
            </label>
          </div>
        </div>

        {status === 'loading' && <SkeletonChart />}

        {status === 'error' && (
          <EmptyState message="Não foi possível carregar as médias. Tente novamente mais tarde." />
        )}

        {status === 'success' && !chartData.length && (
          <EmptyState message="Ainda não há notas lançadas para os critérios selecionados." />
        )}

        {status === 'success' && chartData.length > 0 && (
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mediaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#6b7280" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis stroke="#6b7280" domain={[0, 10]} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  formatter={(value: number | string) =>
                    typeof value === 'number' ? value.toFixed(1) : value
                  }
                  labelFormatter={(label) => String(label)}
                />
                <Area type="monotone" dataKey="media" stroke="#f59e0b" fill="url(#mediaGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Bimestres" value={String(stats.total)} />
          <MiniStat
            label="Melhor média"
            value={stats.total ? stats.best.toFixed(1) : '—'}
          />
          <MiniStat
            label="Média geral"
            value={stats.average !== null && stats.total ? stats.average.toFixed(1) : '—'}
          />
        </div>

        {chartData.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {chartData.map((item) => (
              <MiniStat key={item.bim} label={`${item.bim}º bim.`} value={item.media?.toFixed(1) ?? '—'} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default MediaGeralPorBimestre;
