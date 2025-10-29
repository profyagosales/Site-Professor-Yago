import type { LevelComposer } from '../composerBridge';

const C4_N1: LevelComposer = {
  id: 'C4_N1',
  pieces: [
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n1_multi',
      label: 'Selecione um ou mais (E/OU)',
      options: [
        { id: 'elem_intra_inter', label: 'elementos coesivos intra E/OU interparágrafos' },
        { id: 'repet_excessivas', label: 'EXCESSIVAS repetições' },
        { id: 'inadequ_excessivas', label: 'EXCESSIVAS inadequações' },
      ],
    },
  ],
};

export default C4_N1;
