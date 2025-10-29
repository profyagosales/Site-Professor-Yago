import type { LevelComposer } from '../composerBridge';

const C4_N5: LevelComposer = {
  id: 'C4_N5',
  pieces: [
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n5_multi',
      label: 'Selecione um ou mais (E/OU)',
      options: [
        { id: 'elem_intra_inter', label: 'elementos coesivos intra E/OU interparágrafos' },
        { id: 'repet_raras_ausentes', label: 'RARAS ou AUSENTES repetições' },
        { id: 'inadequ_sem', label: 'SEM inadequações' },
      ],
    },
  ],
};

export default C4_N5;
