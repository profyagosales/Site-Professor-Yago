export type GradeItemType = 'PROVA' | 'TESTE' | 'TRABALHO' | 'PROJETO' | 'ATIVIDADE' | 'OUTROS';

export const GRADE_ITEM_TYPE_OPTIONS: Array<{ value: GradeItemType; label: string; color: string }> = [
  { value: 'PROVA', label: 'Prova', color: '#f97316' },
  { value: 'TESTE', label: 'Teste', color: '#3b82f6' },
  { value: 'TRABALHO', label: 'Trabalho', color: '#10b981' },
  { value: 'PROJETO', label: 'Projeto', color: '#8b5cf6' },
  { value: 'ATIVIDADE', label: 'Atividade', color: '#ec4899' },
  { value: 'OUTROS', label: 'Outros', color: '#6b7280' },
];

export const GRADE_ITEM_TYPE_MAP: Record<GradeItemType, { label: string; color: string }> = GRADE_ITEM_TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = { label: option.label, color: option.color };
    return acc;
  },
  {} as Record<GradeItemType, { label: string; color: string }>
);

export function resolveGradeItemType(value: string | null | undefined): GradeItemType {
  if (!value) return 'OUTROS';
  const normalized = value.trim().toUpperCase() as GradeItemType;
  if (GRADE_ITEM_TYPE_MAP[normalized]) {
    return normalized;
  }
  return 'OUTROS';
}
