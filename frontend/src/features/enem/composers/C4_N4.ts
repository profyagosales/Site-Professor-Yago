import type { LevelComposer } from '../composerBridge';

const C4_N4: LevelComposer = {
  id: 'C4_N4',
  pieces: [
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n4_multi',
      label: 'Selecione um ou mais itens (E/OU)',
      options: [
        { id: 'elem_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos' },
        { id: 'repet_poucas', label: 'E/OU POUCAS repetições' },
        { id: 'inadequ_poucas', label: 'E/OU POUCAS inadequações' },
      ],
    },
  ],
};

export default C4_N4;
