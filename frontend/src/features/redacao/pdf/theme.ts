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

export function columnsActionsCenterComments(contentWidth: number) {
  const gap = CONTENT_GAP;
  // 18% (ações) · 62% (centro) · 20% (comentários)
  const left = Math.round(contentWidth * 0.18);
  const right = Math.round(contentWidth * 0.20);
  const center = Math.max(0, contentWidth - left - right - gap * 2);
  return { left, center, right, gap };
}
export const HERO = {
  HEIGHT: 72,
  RADIUS: 16,
  PAD_X: 18,
  PAD_Y: 12,
  GAP: 14,
};

export const BRAND = {
  ICON: 44,
  // Logo oficial para o PDF (PNG estático recomendado para pdf-lib)
  LOGO_PNG: '/pdf/logo.png',
  // Logo vetorial (apenas fallback para rasterização quando PNG não estiver disponível)
  SVG_URL: '/logo.svg',
  // Fallback existente no projeto
  FALLBACK_URL: '/pdf/brand-mark.png',
};
export const AVATAR = { SIZE: 36 };
export const SCORE = { W: 150, H: 56, R: 14, PAD: 10 };

export const BRAND_COLORS = {
  ORANGE: rgb(0.87, 0.47, 0.17),
  ORANGE_DARK: rgb(0.78, 0.41, 0.15),
  CHIP_BG: rgb(1, 1, 1),
  CHIP_BORDER: rgb(0.99, 0.86, 0.76),
  // aliases esperados pelo header/pdf
  orange500: rgb(0.87, 0.47, 0.17),
  orange300: rgb(0.99, 0.86, 0.76),
};

export const PDF_FONT = {
  XS: 7,
  SM: 8,
  MD: 10,
  LG: 14,
};

export type EnemKey = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

// Paleta por competência (hex), conforme solicitado
export const ENEM_COLORS_HEX: Record<EnemKey, { strong: string; title: string; pastel: string }> = {
  C1: { // Competência I — verde
    strong: '#065F46', // mais forte (destaques/selecionado/UPPERCASE)
    title: '#0F766E',  // título
    pastel: '#D1FAE5', // justificativa (bem clara)
  },
  C2: { // Competência II — rosa
    strong: '#9D174D',
    title: '#BE185D',
    pastel: '#FCE7F3',
  },
  C3: { // Competência III — amarelo (amber)
    strong: '#92400E',
    title: '#B45309',
    pastel: '#FEF3C7',
  },
  C4: { // Competência IV — azul
    strong: '#1E40AF',
    title: '#1D4ED8',
    pastel: '#DBEAFE',
  },
  C5: { // Competência V — laranja
    strong: '#9A3412',
    title: '#EA580C',
    pastel: '#FFEDD5',
  },
};

// Versão já convertida para pdf-lib rgb()
export const ENEM_COLORS: Record<EnemKey, { strong: ReturnType<typeof colorFromHex>; title: ReturnType<typeof colorFromHex>; pastel: ReturnType<typeof colorFromHex> }> = {
  C1: { strong: colorFromHex(ENEM_COLORS_HEX.C1.strong), title: colorFromHex(ENEM_COLORS_HEX.C1.title), pastel: colorFromHex(ENEM_COLORS_HEX.C1.pastel) },
  C2: { strong: colorFromHex(ENEM_COLORS_HEX.C2.strong), title: colorFromHex(ENEM_COLORS_HEX.C2.title), pastel: colorFromHex(ENEM_COLORS_HEX.C2.pastel) },
  C3: { strong: colorFromHex(ENEM_COLORS_HEX.C3.strong), title: colorFromHex(ENEM_COLORS_HEX.C3.title), pastel: colorFromHex(ENEM_COLORS_HEX.C3.pastel) },
  C4: { strong: colorFromHex(ENEM_COLORS_HEX.C4.strong), title: colorFromHex(ENEM_COLORS_HEX.C4.title), pastel: colorFromHex(ENEM_COLORS_HEX.C4.pastel) },
  C5: { strong: colorFromHex(ENEM_COLORS_HEX.C5.strong), title: colorFromHex(ENEM_COLORS_HEX.C5.title), pastel: colorFromHex(ENEM_COLORS_HEX.C5.pastel) },
};

export function enemColor(key: EnemKey) {
  return ENEM_COLORS[key] ?? ENEM_COLORS.C1;
}

// === PAS/UnB palettes ===
// Macro (Azul) and Micro (Rosa), aligned with the app inline cards
export const PAS_MACRO_HEX = {
  strong: '#1E40AF', // deep blue for strong accents
  title:  '#1D4ED8', // blue for titles (range labels, totals)
  pastel: '#DBEAFE', // very light blue for backgrounds
} as const;

export const PAS_MICRO_HEX = {
  strong: '#9D174D', // deep rose for strong accents
  title:  '#BE185D', // rose for titles (formula NR, labels)
  pastel: '#FCE7F3', // very light rose for backgrounds
} as const;

export const PAS_MACRO = {
  strong: colorFromHex(PAS_MACRO_HEX.strong),
  title:  colorFromHex(PAS_MACRO_HEX.title),
  pastel: colorFromHex(PAS_MACRO_HEX.pastel),
} as const;

export const PAS_MICRO = {
  strong: colorFromHex(PAS_MICRO_HEX.strong),
  title:  colorFromHex(PAS_MICRO_HEX.title),
  pastel: colorFromHex(PAS_MICRO_HEX.pastel),
} as const;

// Algarismos romanos para títulos das competências (I..V)
export function toRoman(num: number): string {
  switch (num) {
    case 1: return 'I';
    case 2: return 'II';
    case 3: return 'III';
    case 4: return 'IV';
    case 5: return 'V';
    default: return String(num);
  }
}

/**
 * Converte strings de cor (#rgb, #rrggbb, rgb(), rgba()) em rgb() do pdf-lib.
 * O canal alfa (quando existir) é ignorado pelo pdf-lib (use opacidades na API de draw quando suportado).
 */
export function colorFromHex(input: string) {
  const s = (input || '').trim().toLowerCase();
  // rgb/rgba()
  const mRgb = s.match(/^rgba?\(([^)]+)\)$/);
  if (mRgb) {
    const parts = mRgb[1].split(',').map((v) => parseFloat(v.trim()));
    const [r = 0, g = 0, b = 0] = parts;
    return rgb(Math.max(0, Math.min(1, r / 255)), Math.max(0, Math.min(1, g / 255)), Math.max(0, Math.min(1, b / 255)));
  }
  // #rgb ou #rrggbb
  const h = s.replace(/^#/, '');
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16) || 0;
    const g = parseInt(h[1] + h[1], 16) || 0;
    const b = parseInt(h[2] + h[2], 16) || 0;
    return rgb(r / 255, g / 255, b / 255);
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return rgb(r / 255, g / 255, b / 255);
  }
  // fallback: preto
  return rgb(0, 0, 0);
}
