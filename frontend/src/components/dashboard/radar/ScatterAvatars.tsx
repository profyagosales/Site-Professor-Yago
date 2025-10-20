import { useMemo, useState } from 'react';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip, Scatter, ZAxis } from 'recharts';
import type { RadarDataset, RadarFilters } from '@/types/radar';

interface ScatterAvatarsProps {
  dataset: RadarDataset | null;
  loading: boolean;
  onSelectionChange?: (ids: string[]) => void;
  role?: string;
  groupBy: RadarFilters['groupBy'];
}

const X_OPTIONS = [
  { value: 'avg', label: 'Nota média' },
  { value: 'impact', label: 'Impacto' },
  { value: 'weight', label: 'Peso' },
];

const Y_OPTIONS = [
  { value: 'avg', label: 'Nota média' },
  { value: 'delta', label: 'Desvio' },
];

function LoadingSkeleton() {
  return <div className="h-64 w-full animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />;
}

export default function ScatterAvatars({ dataset, loading, onSelectionChange, role, groupBy }: ScatterAvatarsProps) {
  const [xKey, setXKey] = useState<string>('avg');
  const [yKey, setYKey] = useState<string>('delta');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const points = useMemo(() => {
    if (!dataset) return [];
    return dataset.students.map((student) => {
      const metrics = student.metrics ?? {};
      return {
        id: student.id,
        label: student.name,
        avg: metrics.avg ?? 0,
        delta: metrics.delta ?? 0,
        impact: metrics.consistency ?? Math.random(),
        weight: metrics.sparkline ? metrics.sparkline[metrics.sparkline.length - 1] ?? 1 : 1,
      };
    });
  }, [dataset]);

  const handlePointClick = (pointId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pointId)) {
        next.delete(pointId);
      } else {
        next.add(pointId);
      }
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };

  const chartColor = groupBy === 'class' ? '#2563eb' : '#14b8a6';

  return (
    <div className="flex h-full flex-col gap-3" role="region" aria-label="Dispersão com avatares">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eixo X</span>
          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            value={xKey}
            onChange={(event) => setXKey(event.target.value)}
            aria-label="Selecionar eixo X"
          >
            {X_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eixo Y</span>
          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            value={yKey}
            onChange={(event) => setYKey(event.target.value)}
            aria-label="Selecionar eixo Y"
          >
            {Y_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {selected.size > 0 && (
          <span className="text-xs text-slate-500">{selected.size} selecionado(s)</span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex-1" aria-live="polite">
          <ResponsiveContainer width="100%" height="100%" role="img" aria-label="Gráfico de dispersão">
            <ScatterChart margin={{ top: 16, right: 16, bottom: 8, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey={xKey} name="X" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis type="number" dataKey={yKey} name="Y" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} />
              <ZAxis type="number" dataKey="impact" range={[80, 200]} />
              <Tooltip cursor={{ strokeDasharray: '4 2' }} />
              <Scatter
                data={points}
                fill={chartColor}
                shape={(props) => {
                  const pointId = props.payload?.id as string;
                  const isActive = selected.has(pointId);
                  const size = isActive ? 18 : 12;
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={size}
                      fill={isActive ? chartColor : `${chartColor}55`}
                      stroke={chartColor}
                      strokeWidth={isActive ? 2 : 1}
                      onClick={() => handlePointClick(pointId)}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
