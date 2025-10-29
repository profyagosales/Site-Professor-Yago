import type { LevelComposer } from '../composerBridge';

const C4_N4: LevelComposer = {
  id: 'C4_N4',
  pieces: [
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n4_multi',
      label: 'Selecione um ou mais (E/OU)',
      options: [
        { id: 'elem_intra_inter', label: 'elementos coesivos intra E/OU interparágrafos' },
        { id: 'repet_poucas', label: 'POUCAS repetições' },
        { id: 'inadequ_poucas', label: 'POUCAS inadequações' },
      ],
    },
  ],
};

export default C4_N4;
