export function onlyDigits(v: string | number | null | undefined): string {
  const s = (v ?? '').toString();
  return s.replace(/\D+/g, '');
}

export function formatPhoneBR(v: string | number | null | undefined): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

export function isValidPhoneBR(v: string | number | null | undefined): boolean {
  const len = onlyDigits(v).length;
  return len === 10 || len === 11;
}
