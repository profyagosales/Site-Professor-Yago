export interface CorrectionCategory {
  id: string;
  label: string;
  color: string;
  isError?: boolean;
}

export const CORRECTION_CATEGORIES: CorrectionCategory[] = [
  { id: 'formal', label: 'Aspectos formais', color: 'rgba(251, 146, 60, 0.5)', comment: 'formatação, apresentação, título, margens etc.' },
  { id: 'grammar', label: 'Ortografia/gramática', color: 'rgba(74, 222, 128, 0.5)', isError: true, comment: 'erros linguísticos' },
  { id: 'argument', label: 'Argumentação e estrutura', color: 'rgba(250, 204, 21, 0.5)', comment: 'tese, coesão global do argumento, progressão' },
  { id: 'general', label: 'Comentário geral', color: 'rgba(248, 113, 113, 0.5)', comment: 'observações amplas, críticas macro' },
  { id: 'cohesion', label: 'Coesão e coerência', color: 'rgba(96, 165, 250, 0.5)', comment: 'conectivos, referências pronominais, concordância textual' },
];
