import { rgb } from 'pdf-lib';

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

export function columns8020(contentWidth: number) {
  const gap = CONTENT_GAP;
  const left = contentWidth * 0.8;
  const right = contentWidth - left - gap;
  return { left, right, gap };
}
export const HERO = {
  HEIGHT: 72,
  RADIUS: 16,
  PAD_X: 18,
  PAD_Y: 12,
  GAP: 14,
};

export const BRAND = { ICON: 44 };
export const AVATAR = { SIZE: 36 };
export const SCORE = { W: 150, H: 56, R: 14, PAD: 10 };

export const BRAND_COLORS = {
  ORANGE: rgb(0.87, 0.47, 0.17),
  ORANGE_DARK: rgb(0.78, 0.41, 0.15),
  CHIP_BG: rgb(1, 1, 1),
  CHIP_BORDER: rgb(0.99, 0.86, 0.76),
};

export const PDF_FONT = {
  XS: 7,
  SM: 8,
  MD: 10,
  LG: 14,
};
