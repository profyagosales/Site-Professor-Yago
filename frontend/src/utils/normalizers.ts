/** Fallback shown when the turma identificador cannot be derived. */
const FALLBACK = '—';

/**
 * Normaliza identificadores de turma para um formato consistente e amigável.
 * Ideal para exibição em chips/listas. Ao encontrar valores vazios retorna `—`.
 */
export function normalizeClassId(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return FALLBACK;
  }

  const raw = String(value).trim();
  if (!raw) {
    return FALLBACK;
  }

  let cleaned = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[º°]/g, 'º')
    .replace(/\s+/g, ' ')
    .toUpperCase();

  cleaned = cleaned.replace(/º(?=[A-Z0-9])/g, 'º ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned || /^TODAS(?:\s+AS\s+TURMAS)?$/.test(cleaned) || cleaned === 'ALL') {
    return FALLBACK;
  }

  const compact = cleaned.replace(/\s+/g, '');
  const canonical = compact.replace(/º/g, '');

  const gradeMatch = canonical.match(/^(\d+)([A-Z])$/);
  if (gradeMatch) {
    const [, grade, letter] = gradeMatch;
    return `${grade}º ${letter}`;
  }

  const map: Record<string, string> = {
    '2A': '2º A',
    '2B': '2º B',
  };

  const mapped = map[canonical] ?? cleaned;
  return mapped || FALLBACK;
}

/**
 * Variante tolerante que evita que exceções de parsing quebrem o app.
 * Util quando o dado pode ter formatos inesperados ou vir de fontes externas.
 */
export function safeNormalizeClassId(value: unknown): string {
  try {
    return normalizeClassId(value as string | number | null | undefined);
  } catch {
    const fallback = value == null ? FALLBACK : String(value);
    const trimmed = fallback.trim();
    return trimmed || FALLBACK;
  }
}
