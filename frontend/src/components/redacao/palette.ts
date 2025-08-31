export const HIGHLIGHT_PALETTE = [
  { id: 'formal',    label: 'Aspectos formais',         hex: '#FDBA74', fill: '#FDBA7459' },
  { id: 'grammar',   label: 'Ortografia/gramática',     hex: '#22C55E', fill: '#22C55E59' },
  { id: 'argument',  label: 'Argumentação e estrutura', hex: '#FDE68A', fill: '#FDE68A66' },
  { id: 'general',   label: 'Comentário geral',         hex: '#FCA5A5', fill: '#FCA5A559' },
  { id: 'cohesion',  label: 'Coesão e coerência',       hex: '#93C5FD', fill: '#93C5FD59' },
] as const;

export type HighlightCategoryId = typeof HIGHLIGHT_PALETTE[number]['id'];

export const paletteByFill: Record<string, HighlightCategoryId> =
  Object.fromEntries(HIGHLIGHT_PALETTE.map(p => [p.fill.toLowerCase(), p.id]));
