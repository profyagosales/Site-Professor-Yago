export function pasPreviewFrom({
  NC,
  NL,
  annotations,
  weight,
}: {
  NC: number;
  NL: number;
  annotations: Array<{ color: string; label?: string }>;
  weight: number;
}) {
  const ne = annotations.filter(
    a => a.color === 'green' && (a.label || '').toLowerCase().includes('erro')
  ).length;
  const clamp = (n: number, min: number, max: number) =>
    Math.min(Math.max(n, min), max);
  const raw =
    Math.round(clamp(NC - (2 * ne) / Math.max(1, NL), 0, 10) * 100) / 100;
  const scaled = Math.round(Math.min(weight, weight * (raw / 10)) * 10) / 10;
  return { raw, scaled, ne };
}
