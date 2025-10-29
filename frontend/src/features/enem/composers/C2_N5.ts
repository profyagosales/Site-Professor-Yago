import type { LevelComposer } from '../composerBridge';

const C2_N5: LevelComposer = {
  id: 'C2_N5',
  pieces: [
    { kind: 'MANDATORY', key: 'c2n5_abordagem', label: 'Abordagem completa do tema' },
    { kind: 'MANDATORY', key: 'c2n5_partes', label: '3 partes do texto (nenhuma embrionária)' },
    { kind: 'MANDATORY', key: 'c2n5_rep_leg', label: 'Repertório legitimado' },
    { kind: 'MANDATORY', key: 'c2n5_rep_pert', label: 'Pertinente ao tema, COM uso produtivo' },
  ],
  connectors: ['E'],
};

export default C2_N5;
