import type { LevelComposer } from '../composerBridge';

const C2_N2: LevelComposer = {
  id: 'C2_N2',
  pieces: [
    { kind: 'MANDATORY', key: 'c2n2_abordagem', label: 'Abordagem completa do tema', noId: true },
    {
      kind: 'CHOICE_SINGLE',
      key: 'c2n2_ou',
      label: 'Escolha uma opção (OU)',
      options: [
        { id: 'partes_2_embr', label: '3 partes do texto (2 delas embrionárias)' },
        { id: 'conclusao_inc', label: 'Conclusão finalizada por frase incompleta' },
      ],
    },
    {
      kind: 'CHOICE_MULTI',
      key: 'c2n2_flag',
      label: 'Opções adicionais',
      options: [
        { id: 'muitas_copias', label: 'Redação com muitas cópias' },
      ],
    },
  ],
};

export default C2_N2;
