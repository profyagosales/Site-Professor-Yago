import type { LevelComposer } from '../composerBridge';

const C5_N2: LevelComposer = {
  id: 'C5_N2',
  pieces: [
    {
      kind: 'CHOICE_SINGLE',
      key: 'c5n2_ou',
      label: 'Escolha uma opção (OU)',
      options: [
        { id: 'dois_validos', label: '2 elementos válidos' },
        { id: 'condicional_2plus', label: 'Estrutura CONDICIONAL com dois ou mais elementos válidos' },
      ],
    },
  ],
};

export default C5_N2;
