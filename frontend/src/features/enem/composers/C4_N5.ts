import type { LevelComposer } from '../composerBridge';

const C4_N5: LevelComposer = {
  id: 'C4_N5',
  pieces: [
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n5_multi',
      label: 'Selecione um ou mais itens (E/OU)',
      options: [
        { id: 'elem_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos' },
        { id: 'repet_raras_ausentes', label: 'E/OU RARAS ou AUSENTES repetições' },
        { id: 'inadequ_sem', label: 'E/OU SEM inadequações' },
      ],
    },
  ],
};

export default C4_N5;
