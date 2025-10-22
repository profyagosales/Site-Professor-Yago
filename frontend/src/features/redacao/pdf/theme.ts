export const A4 = { w: 595, h: 842 }; // A4 em points
export const MARGIN = 24; // bordas menores (mais área útil)
export const ORANGE = '#ff8a2a';
export const BG = '#ffffff';
export const GRAY = '#e9eef3';
export const TEXT = '#1f2937';
export const TEXT_SUBTLE = '#64748b';
export const CATEGORY = {
  argument: '#ffd666', // Amarelo
  grammar: '#94e3b1', // Verde
  cohesion: '#a8d1ff', // Azul
  presentation: '#ffc999', // Laranja
  general: '#ffc0c0', // Vermelho claro
} as const;

export const HEADER_HEIGHT = 112;
export const CONTENT_GAP = 12;
export const PREVIEW_PADDING = 8;
export const TITLE_SIZE = 11;
export const BODY_SIZE = 10;

export function columns(contentWidth: number) {
  const left = Math.floor(contentWidth * 0.65);
  const right = contentWidth - left - CONTENT_GAP;
  return { left, right };
}
