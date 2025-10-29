import type { LevelComposer } from '../composerBridge';

const C5_N1: LevelComposer = {
  id: 'C5_N1',
  pieces: [
    {
      kind: 'CHOICE_SINGLE',
      key: 'c5n1_ou',
      label: 'Escolha uma opção (OU)',
      options: [
        { id: 'tangenciamento', label: 'Tangenciamento ao tema' },
        { id: 'apenas_nulos', label: 'Apenas elementos nulos' },
        { id: 'um_valido', label: '1 elemento válido' },
      ],
    },
  ],
};

export default C5_N1;
