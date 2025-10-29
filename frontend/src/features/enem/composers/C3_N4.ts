import type { LevelComposer } from '../composerBridge';

const C3_N4: LevelComposer = {
  id: 'C3_N4',
  pieces: [
    { kind: 'MANDATORY', key: 'c3n4_proj', label: 'Projeto de texto com POUCAS falhas' },
    {
      kind: 'MANDATORY',
      key: 'c3n4_dev',
      label: 'Desenvolvimento de informações, fatos e opiniões com POUCAS lacunas',
    },
  ],
  connectors: ['E'],
};

export default C3_N4;
