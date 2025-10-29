import type { LevelComposer } from '../composerBridge';

const C4_N3: LevelComposer = {
  id: 'C4_N3',
  pieces: [
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n3_multi',
      label: 'Selecione um ou mais itens (E/OU)',
      options: [
        { id: 'elem_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos' },
        { id: 'repet_algumas', label: 'E/OU ALGUMAS repetições' },
        { id: 'inadequ_algumas', label: 'E/OU ALGUMAS inadequações' },
      ],
    },
  ],
};

export default C4_N3;
