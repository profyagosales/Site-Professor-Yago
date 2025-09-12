// Motivos de anulação de redação
export const ANNULMENT_REASONS = [
  {
    id: 'blank',
    label: 'Em branco ou insuficiente',
    description: 'A redação está em branco ou possui menos de 7 linhas.'
  },
  {
    id: 'off_topic',
    label: 'Fuga ao tema',
    description: 'A redação não aborda o tema proposto.'
  },
  {
    id: 'wrong_type',
    label: 'Não atende ao tipo textual',
    description: 'Texto não é dissertativo-argumentativo (ENEM) ou não atende ao tipo solicitado (PAS).'
  },
  {
    id: 'copy',
    label: 'Cópia do texto motivador',
    description: 'Texto é mera cópia dos textos motivadores ou de outros textos.'
  },
  {
    id: 'rights_violation',
    label: 'Desrespeito aos direitos humanos',
    description: 'Texto contém desrespeito aos direitos humanos.'
  },
  {
    id: 'illegible',
    label: 'Texto ilegível',
    description: 'Não é possível compreender o texto devido à grafia.'
  },
  {
    id: 'deliberate_mark',
    label: 'Parte deliberadamente destacada',
    description: 'Texto possui parte deliberadamente destacada pelo candidato.'
  },
  {
    id: 'foreign_language',
    label: 'Texto em língua estrangeira',
    description: 'Texto escrito predominantemente em língua estrangeira.'
  },
  {
    id: 'drawings',
    label: 'Desenhos ou outras formas indevidas',
    description: 'Presença de desenhos, recados, mensagens ou outras formas propositais de anulação.'
  },
  {
    id: 'other',
    label: 'Outro motivo',
    description: 'Outro motivo não listado acima.'
  }
];