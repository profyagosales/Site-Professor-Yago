import type { LevelComposer } from '../composerBridge';

const C3_N3: LevelComposer = {
  id: 'C3_N3',
  pieces: [
    {
      kind: 'MANDATORY',
      key: 'c3n3_proj',
      label: 'Projeto de texto com ALGUMAS falhas',
      noId: true,
    },
    {
      kind: 'MANDATORY',
      key: 'c3n3_dev',
      label: 'Desenvolvimento de informações, fatos e opiniões com ALGUMAS lacunas',
      noId: true,
    },
  ],
  connectors: ['E'],
};

export default C3_N3;
