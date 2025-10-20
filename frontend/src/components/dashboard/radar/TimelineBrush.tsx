import { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Brush } from 'recharts';
import type { RadarDataset } from '@/types/radar';

interface TimelineBrushProps {
  dataset: RadarDataset | null;
  loading: boolean;
  onRangeChange?: (range: { start: string | null; end: string | null }) => void;
}

function LoadingSkeleton() {
  return <div className="h-56 w-full animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />;
}

function formatDateLabel(dateISO: string) {
  try {
    return new Date(dateISO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch (error) {
    return dateISO;
  }
}

export default function TimelineBrush({ dataset, loading, onRangeChange }: TimelineBrushProps) {
  const [preset, setPreset] = useState<'week' | 'month' | 'custom'>('month');
  const data = useMemo(() => dataset?.timeseries ?? [], [dataset]);

  const handlePresetChange = (value: 'week' | 'month') => {
    setPreset(value);
    if (!data.length) return;
    const now = new Date();
    const delta = value === 'week' ? 7 : 30;
    const startDate = new Date(now.getTime() - delta * 24 * 60 * 60 * 1000);
    onRangeChange?.({ start: startDate.toISOString(), end: now.toISOString() });
  };

  return (
    <div className="flex h-full flex-col gap-3" role="region" aria-label="Linha do tempo de notas">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wide">Período</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
              preset === 'week' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => handlePresetChange('week')}
          >
            Semana
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
              preset === 'month' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            onClick={() => handlePresetChange('month')}
          >
            Mês
          </button>
        </div>
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%" role="img" aria-label="Série temporal de notas">
            <LineChart data={data} margin={{ top: 12, right: 24, bottom: 12, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="dateISO"
                tickFormatter={formatDateLabel}
                minTickGap={24}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 10]} />
              <Tooltip
                formatter={(value: number) => value.toFixed(1)}
                labelFormatter={(value) => formatDateLabel(String(value))}
              />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="comparative"
                stroke="#94a3b8"
                strokeDasharray="4 3"
                dot={false}
                strokeWidth={2}
              />
              <Brush
                dataKey="dateISO"
                height={28}
                travellerWidth={12}
                stroke="#2563eb"
                tickFormatter={formatDateLabel}
                onChange={(range) => {
                  setPreset('custom');
                  onRangeChange?.({
                    start: typeof range?.startIndex === 'number' ? data[range.startIndex]?.dateISO ?? null : null,
                    end: typeof range?.endIndex === 'number' ? data[range.endIndex]?.dateISO ?? null : null,
                  });
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
