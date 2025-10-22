import { getClassColor, isColorLight } from '@/features/schedule/colors';

export type ClassColor = { hex: string };

export function resolveClassColor(key?: string | null): ClassColor {
  return { hex: getClassColor(key ?? undefined) };
}

export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : normalized;

  if (expanded.length !== 6) {
    return hex;
  }

  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  const clampedAlpha = Math.min(Math.max(alpha, 0), 1);

  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

export function autoTextColor(hex: string): 'black' | 'white' {
  return isColorLight(hex) ? 'black' : 'white';
}
