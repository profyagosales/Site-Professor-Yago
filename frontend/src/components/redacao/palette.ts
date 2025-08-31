export const HIGHLIGHT_PALETTE = [
  { id: 'formal',    label: 'Aspectos formais',         hex: '#FF8A00', fill: '#FF8A0059' },
  { id: 'grammar',   label: 'Ortografia/gramática',     hex: '#22C55E', fill: '#22C55E59' },
  { id: 'argument',  label: 'Argumentação e estrutura', hex: '#F59E0B', fill: '#F59E0B66' },
  { id: 'general',   label: 'Comentário geral',         hex: '#EF4444', fill: '#EF4444A6' },
  { id: 'cohesion',  label: 'Coesão e coerência',       hex: '#3B82F6', fill: '#3B82F6A6' },
] as const;

export type HighlightCategoryId = typeof HIGHLIGHT_PALETTE[number]['id'];

export const paletteByFill: Record<string, HighlightCategoryId> =
  Object.fromEntries(HIGHLIGHT_PALETTE.map(p => [p.fill.toLowerCase(), p.id]));
