import type { LevelComposer } from '../composerBridge';

const C4_N2: LevelComposer = {
  id: 'C4_N2',
  pieces: [
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n2_multi',
      label: 'Selecione um ou mais (E/OU)',
      options: [
        { id: 'elem_intra_inter', label: 'elementos coesivos intra E/OU interparágrafos' },
        { id: 'repet_muitas', label: 'MUITAS repetições' },
        { id: 'inadequ_muitas', label: 'MUITAS inadequações' },
      ],
    },
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n2_flag',
      label: 'Opções adicionais',
      options: [{ id: 'monobloco', label: 'Texto monobloco' }],
    },
  ],
};

export default C4_N2;
