import { memo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
} from 'recharts';

type ChartDatum = {
  bimester: number;
  label: string;
  avg: number;
  median: number;
  count: number;
};

function AverageBimesterChartComponent({ data }: { data: ChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis domain={[0, 10]} allowDecimals width={36} />
        <Tooltip
          formatter={(value: string | number, name) => {
            if (typeof value === 'number' && Number.isFinite(value)) {
              if (name === 'avg') return [value.toFixed(1), 'Média'];
              if (name === 'median') return [value.toFixed(1), 'Mediana'];
              return [value.toFixed(1), name];
            }
            return [value, name];
          }}
          labelFormatter={(label) => String(label)}
        />
        <Bar dataKey="avg" name="Média" fill="#fb923c" radius={[6, 6, 0, 0]} />
        <Line type="monotone" dataKey="median" name="Mediana" stroke="#1f2937" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default memo(AverageBimesterChartComponent);
