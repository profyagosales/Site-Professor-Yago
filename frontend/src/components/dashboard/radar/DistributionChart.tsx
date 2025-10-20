import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import type { RadarDataset, RadarFilters } from '@/types/radar';

interface DistributionChartProps {
  dataset: RadarDataset | null;
  loading: boolean;
  groupBy: RadarFilters['groupBy'];
  onHighlight?: (studentId: string | null) => void;
}

function LoadingSkeleton() {
  return <div className="h-56 w-full animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />;
}

export default function DistributionChart({ dataset, loading, groupBy, onHighlight: _onHighlight }: DistributionChartProps) {
  const data = useMemo(() => {
    if (!dataset) return [];
    const grouped = new Map<string, { group: string; values: number[] }>();
    dataset.distributions.forEach((entry) => {
      const key = groupBy === 'class' ? entry.groupId : dataset.activities.find((activity) => activity.id === entry.groupId)?.type ?? entry.groupId;
      if (!grouped.has(key)) {
        grouped.set(key, { group: key, values: [] });
      }
      grouped.get(key)?.values.push(entry.value);
    });
    return Array.from(grouped.values()).map(({ group, values }) => {
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      const avg = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
      return {
        group,
        median,
        avg,
      };
    });
  }, [dataset, groupBy]);

  const accent = groupBy === 'class' ? '#6366f1' : '#0ea5e9';

  return (
    <div className="flex h-full flex-col gap-3" role="region" aria-label="Distribuição de notas">
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <ResponsiveContainer width="100%" height="100%" role="img" aria-label="Distribuição das notas">
          <BarChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="group" angle={-20} textAnchor="end" height={60} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip formatter={(value: number) => value.toFixed(1)} />
            <Bar dataKey="avg" fill={accent} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
