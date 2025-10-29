import type { LevelComposer } from '../composerBridge';

const C3_N2: LevelComposer = {
  id: 'C3_N2',
  pieces: [
    { kind: 'MANDATORY', key: 'c3n2_proj', label: 'projeto de texto com MUITAS falhas' },
    {
      kind: 'CHOICE_SINGLE',
      key: 'c3n2_dev',
      label: 'Selecione uma opção (OU)',
      options: [
        { id: 'sem_dev', label: 'sem desenvolvimento' },
        { id: 'dev_uma_info', label: 'desenvolvimento de apenas uma informação' },
      ],
    },
    {
      kind: 'CHOICE_MULTI',
      key: 'c3n2_flag',
      label: 'Opções adicionais',
      options: [{ id: 'contradicao_grave', label: 'Contradição grave' }],
    },
  ],
};

export default C3_N2;
