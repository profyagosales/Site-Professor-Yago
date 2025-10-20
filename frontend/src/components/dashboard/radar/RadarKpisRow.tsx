import { useMemo, type ReactNode } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import type { RadarDataset, RadarFilters } from '@/types/radar';

interface RadarKpisRowProps {
  loading: boolean;
  kpis: RadarDataset['kpis'] | null;
  groupBy: RadarFilters['groupBy'];
  accentColor?: string;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = useMemo(() => data.map((value, index) => ({ index, value })), [data]);
  return (
    <ResponsiveContainer width="100%" height={40} role="img" aria-label="Histórico do indicador">
      <AreaChart data={chartData} margin={{ top: 6, left: 0, right: 0, bottom: 0 }}>
        <Tooltip
          cursor={false}
          contentStyle={{ background: 'rgba(15,23,42,0.85)', borderRadius: 8, border: 'none', color: '#fff' }}
          formatter={(value: number) => [value.toFixed(1), 'Valor']}
          labelFormatter={(index) => `Ponto ${Number(index) + 1}`}
        />
        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function LoadingSkeleton() {
  return <div className="h-20 w-full animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />;
}

function Indicator({
  title,
  value,
  suffix,
  delta,
  children,
}: {
  title: string;
  value: number;
  suffix?: string;
  delta?: number;
  children?: ReactNode;
}) {
  const formatted = Number.isFinite(value) ? value.toFixed(suffix ? 0 : 1) : '--';
  const deltaClass = delta && delta !== 0 ? (delta > 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400';
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl bg-slate-50 p-4" role="group" aria-label={title}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
        {Number.isFinite(delta) && (
          <span className={`text-xs font-medium ${deltaClass}`}>
            {delta! > 0 ? '+' : ''}
            {Number.isFinite(delta) ? delta!.toFixed(1) : '--'}
            {suffix === '%' ? '%' : ''}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-4">
        <span className="text-2xl font-semibold text-slate-900">
          {formatted}
          {suffix}
        </span>
        <div className="h-10 min-w-[120px] flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function RadarKpisRow({ loading, kpis, groupBy, accentColor }: RadarKpisRowProps) {
  const data = kpis ?? {
    avg: 0,
    passBim: 0,
    passYear: 0,
    avgSparkline: [],
    passBimDelta: 0,
    passYearDelta: 0,
  };

  const palette = accentColor ?? (groupBy === 'class' ? '#2563eb' : '#0f172a');
  const sparklineData = data.avgSparkline && data.avgSparkline.length ? data.avgSparkline : [0, 0, 0, 0, 0, 0, 0, 0];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3" aria-label="Indicadores do radar carregando">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3" aria-label="Indicadores do radar">
      <Indicator title="Média no recorte" value={data.avg}>
        <Sparkline data={sparklineData} color={palette} />
      </Indicator>
      <Indicator title="% Aprovados (bimestre)" value={data.passBim} suffix="%" delta={data.passBimDelta}>
        <Sparkline data={sparklineData} color={palette} />
      </Indicator>
      <Indicator title="% Aprovados (ano)" value={data.passYear} suffix="%" delta={data.passYearDelta}>
        <Sparkline data={sparklineData} color={palette} />
      </Indicator>
    </div>
  );
}
