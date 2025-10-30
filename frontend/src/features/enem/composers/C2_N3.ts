import type { LevelComposer } from '../composerBridge';

const C2_N3: LevelComposer = {
  id: 'C2_N3',
  pieces: [
    {
      kind: 'MANDATORY',
      key: 'c2n3_abordagem',
      label: 'Abordagem completa do tema',
      noId: true,
    },
    { kind: 'MANDATORY', key: 'c2n3_partes', label: '3 partes do texto (1 delas embrionárias)' },
    {
      kind: 'CHOICE_MULTI',
      key: 'c2n3_rep',
      label: 'Repertório (E/OU)',
      options: [
        { id: 'rep_nao_leg', label: 'repertório NÃO legitimado' },
        { id: 'rep_leg_nao', label: 'repertório legitimado MAS não pertencente ao tema' },
      ],
    },
  ],
  connectors: ['E', 'E/OU'],
};

export default C2_N3;
