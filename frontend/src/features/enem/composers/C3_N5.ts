import type { LevelComposer } from '../composerBridge';

const C3_N5: LevelComposer = {
  id: 'C3_N5',
  pieces: [
    { kind: 'MANDATORY', key: 'c3n5_proj', label: 'Projeto de texto estratégico' },
    {
      kind: 'MANDATORY',
      key: 'c3n5_dev',
      label: 'Desenvolvimento de informações, fatos e opiniões em TODO o texto',
    },
  ],
  connectors: ['E'],
};

export default C3_N5;
