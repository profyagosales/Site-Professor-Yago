import { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { RadarDataset } from '@/types/radar';

interface ApprovalDonutProps {
  dataset: RadarDataset | null;
  loading: boolean;
  onSelectStatus?: (status: 'pass' | 'risk' | 'none') => void;
}

const COLORS = {
  pass: '#22c55e',
  risk: '#f97316',
  none: '#cbd5f5',
};

function LoadingSkeleton() {
  return <div className="h-60 w-full animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />;
}

export default function ApprovalDonut({ dataset, loading, onSelectStatus }: ApprovalDonutProps) {
  const [scope, setScope] = useState<'bim' | 'year'>('bim');

  const data = useMemo(() => {
    const approvals = dataset?.approvals?.[scope] ?? { pass: 0, risk: 0, none: 0 };
    return (
      Object.entries(approvals) as Array<['pass' | 'risk' | 'none', number]>
    ).map(([status, value]) => ({ status, value }));
  }, [dataset, scope]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex h-full flex-col gap-3" role="region" aria-label="Aprovação por status">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wide">Escopo</span>
        <button
          type="button"
          className={`rounded-full px-3 py-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
            scope === 'bim' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => setScope('bim')}
        >
          Bimestre
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
            scope === 'year' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => setScope('year')}
        >
          Ano
        </button>
      </div>
      <div className="flex flex-1 flex-col">
        <ResponsiveContainer width="100%" height="100%" role="img" aria-label="Distribuição de aprovação">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="status"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              onClick={(entry) => {
                const status = entry?.status as 'pass' | 'risk' | 'none';
                if (status) onSelectStatus?.(status);
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            <Legend
              verticalAlign="bottom"
              formatter={(value) =>
                ({ pass: 'Aprovados', risk: 'Em risco', none: 'Sem nota' }[value as keyof typeof COLORS] ?? value)
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
