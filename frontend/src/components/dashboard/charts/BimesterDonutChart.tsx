import { memo, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#fb923c', '#f97316', '#facc15', '#22c55e'];

type PieDatum = {
  name: string;
  value: number;
};

type BimesterDonutChartProps = {
  data: PieDatum[];
  total: number;
};

function BimesterDonutChartComponent({ data, total }: BimesterDonutChartProps) {
  const legend = useMemo(() => data.map((item, index) => ({ ...item, color: COLORS[index % COLORS.length] })), [data]);

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="h-[200px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Tooltip formatter={(value: number) => [`${value}`, 'Quantidade']} />
            <Pie
              data={legend}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
            >
              {legend.map((entry) => (
                <Cell key={`pie-${entry.name}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {total > 0 ? (
          legend.map((item) => (
            <div key={`legend-${item.name}`} className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-slate-800">{item.name}</span>
              <span className="text-xs text-slate-500">
                {item.value} avaliações
                {total ? ` (${((item.value / total) * 100).toFixed(1)}%)` : ''}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">Nenhuma avaliação contabilizada no período.</p>
        )}
      </div>
    </div>
  );
}

export default memo(BimesterDonutChartComponent);
