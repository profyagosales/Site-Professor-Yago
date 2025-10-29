import type { LevelComposer } from '../composerBridge';

const C2_N1: LevelComposer = {
  id: 'C2_N1',
  pieces: [
    {
      kind: 'CHOICE_SINGLE',
      key: 'c2n1_ou',
      label: 'Selecione um (OU)',
      options: [
        { id: 'tangencia', label: 'Tangência ao tema' },
        { id: 'caotico', label: 'Texto composto por aglomerado caótico de palavras' },
        { id: 'tipos', label: 'Traços constantes de outros tipos textuais' },
      ],
    },
  ],
};

export default C2_N1;
