import type { LevelComposer } from '../composerBridge';

const C4_N2: LevelComposer = {
  id: 'C4_N2',
  pieces: [
    {
      kind: 'CHOICE_MULTI',
      key: 'c4n2_multi',
      label: 'Selecione um ou mais itens (E/OU)',
      options: [
        { id: 'elem_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos' },
        { id: 'repet_muitas', label: 'E/OU MUITAS repetições' },
        { id: 'inadequ_muitas', label: 'E/OU MUITAS inadequações' },
      ],
    },
    {
      kind: 'MONOBLOCK',
      key: 'c4n2_flag',
      label: 'Texto monobloco (toma a justificativa inteira)',
      optionId: 'monobloco',
    },
  ],
  connectors: ['E/OU', 'OU'],
};

export default C4_N2;
