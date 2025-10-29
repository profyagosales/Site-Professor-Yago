import type { LevelComposer } from '../composerBridge';

const C5_N0: LevelComposer = {
  id: 'C5_N0',
  pieces: [
    {
      kind: 'CHOICE_SINGLE',
      key: 'c5n0_ou',
      label: 'Escolha uma opção (OU)',
      options: [
        { id: 'ausencia', label: 'Ausência de proposta' },
        { id: 'desrespeito_dh', label: 'Proposta de intervenção que desrespeita os direitos humanos' },
        { id: 'nao_relacionada', label: 'Proposta de intervenção não relacionada ao assunto' },
      ],
    },
  ],
};

export default C5_N0;
