import type { LevelComposer } from '../composerBridge';

const C2_N4: LevelComposer = {
  id: 'C2_N4',
  pieces: [
    { kind: 'MANDATORY', key: 'c2n4_abordagem', label: 'Abordagem completa do tema', noId: true },
    { kind: 'MANDATORY', key: 'c2n4_partes', label: '3 partes do texto (nenhuma embrionária)' },
    { kind: 'MANDATORY', key: 'c2n4_rep_leg', label: 'Repertório legitimado' },
    { kind: 'MANDATORY', key: 'c2n4_rep_pert', label: 'Pertinente ao tema, SEM uso produtivo' },
  ],
  connectors: ['E'],
};

export default C2_N4;
