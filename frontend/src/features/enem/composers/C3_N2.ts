import type { LevelComposer } from '../composerBridge';

const C3_N2: LevelComposer = {
  id: 'C3_N2',
  pieces: [
    { kind: 'MANDATORY', key: 'c3n2_proj', label: 'Projeto de texto com MUITAS falhas' },
    {
      kind: 'CHOICE_SINGLE',
      key: 'c3n2_dev',
      label: 'Sem desenvolvimento OU desenvolvimento de apenas uma informação',
      options: [
        { id: 'sem_dev', label: 'Sem desenvolvimento' },
        { id: 'dev_uma_info', label: 'Desenvolvimento de apenas uma informação' },
      ],
    },
    {
      kind: 'MONOBLOCK',
      key: 'c3n2_flag',
      label: 'Contradição grave (toma a justificativa inteira)',
      optionId: 'contradicao_grave',
    },
  ],
  connectors: ['E', 'OU'],
};

export default C3_N2;
