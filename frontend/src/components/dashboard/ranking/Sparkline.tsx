import { memo, useMemo } from 'react';

interface SparklineProps {
  values: number[];
}

export default memo(function Sparkline({ values }: SparklineProps) {
  const { path, viewBox } = useMemo(() => {
    if (!values.length) {
      return { path: '', viewBox: '0 0 40 16' };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = Math.max((values.length - 1) * 8, 32);
    const height = 16;
    const points = values.map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const normalized = (value - min) / range;
      const y = height - normalized * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return {
      path: `M${points.join(' L')}`,
      viewBox: `0 0 ${width.toFixed(1)} ${height}`,
    };
  }, [values]);

  if (!path) {
    return null;
  }

  return (
    <svg
      className="h-4 w-16 text-slate-400/70"
      viewBox={viewBox}
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
});
