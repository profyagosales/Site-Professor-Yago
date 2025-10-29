import type { LevelComposer } from '../composerBridge';

const C4_N1: LevelComposer = {
  id: 'C4_N1',
  pieces: [
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n1_multi',
      label: 'Selecione um ou mais itens (E/OU)',
      options: [
        { id: 'elem_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos' },
        { id: 'repet_excessivas', label: 'E/OU EXCESSIVAS repetições' },
        { id: 'inadequ_excessivas', label: 'E/OU EXCESSIVAS inadequações' },
      ],
    },
  ],
};

export default C4_N1;
