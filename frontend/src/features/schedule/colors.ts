// Centraliza o mapa de cores das turmas e utilitários para reutilização.
// Se futuramente existir uma fonte de cores no backend, este arquivo deve ser o único
// ponto de alteração para repassar o mapa aos componentes (Horário, Turmas, etc).
export const CLASS_COLOR_MAP: Record<string, string> = {
  // Exemplos: substitua pelas chaves reais das turmas quando disponíveis.
  // "classId-or-name": "#hexcode",
  // Valores padrão para fallback/geração estável:
};

const DEFAULT_PALETTE = [
  "#F59E0B", // amber-500
  "#10B981", // emerald-500
  "#3B82F6", // blue-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#F97316", // orange-500
  "#06B6D4", // cyan-500
];

export function getClassColor(key?: string) {
  if (!key) return DEFAULT_PALETTE[0];
  // Priorizar mapa explícito se houver entrada
  if (CLASS_COLOR_MAP[key]) return CLASS_COLOR_MAP[key];

  // Hash simples determinístico para indexar a paleta
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return DEFAULT_PALETTE[Math.abs(hash) % DEFAULT_PALETTE.length];
}

export function isColorLight(hex: string) {
  if (!hex) return true;
  const h = hex.replace("#", "");
  if (h.length !== 6) return true;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

