export const HIGHLIGHT_ALPHA = 0.55;

export const HIGHLIGHT_CATEGORIES = {
  argumentacao: { label: 'Argumentação', color: '#FDE68A' },
  ortografia: { label: 'Ortografia/Gramática', color: '#86EFAC' },
  coesao: { label: 'Coesão/Coerência', color: '#93C5FD' },
  apresentacao: { label: 'Apresentação', color: '#FDBA74' },
  comentarios: { label: 'Comentários gerais', color: '#FCA5A5' },
} as const;

export type HighlightCategoryKey = keyof typeof HIGHLIGHT_CATEGORIES;
