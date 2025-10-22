export type LogicalOp = 'AND' | 'OR';

export type RubricCriterion = { id: string; label: string };

export type RubricGroup = {
  op: LogicalOp;
  items: Array<RubricCriterion | RubricGroup>;
  multiple?: boolean;
};

export type EnemLevel = {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  points: number;
  summary: string;
  rationale?: RubricGroup;
};

export type EnemCompetency = {
  key: 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
  title: string;
  description: string;
  levels: EnemLevel[];
};

const P = (n: number) => (n * 40) as 0 | 40 | 80 | 120 | 160 | 200;

export const ENEM_2024: EnemCompetency[] = [
  {
    key: 'C1',
    title: 'Competência 1',
    description: 'Domínio da norma padrão da língua portuguesa.',
    levels: [
      { level: 0, points: P(0), summary: 'Estrutura sintática inexistente (independentemente da quantidade de desvios)' },
      { level: 1, points: P(1), summary: 'Estrutura sintática deficitária COM muitos desvios' },
      { level: 2, points: P(2), summary: 'Estrutura sintática deficitária OU muitos desvios' },
      { level: 3, points: P(3), summary: 'Estrutura sintática regular E alguns desvios' },
      { level: 4, points: P(4), summary: 'Estrutura sintática boa E poucos desvios' },
      { level: 5, points: P(5), summary: 'Estrutura sintática excelente (no máximo, uma falha) E, no máximo, dois desvios' },
    ],
  },
  {
    key: 'C2',
    title: 'Competência 2',
    description: 'Compreensão da proposta de redação e aplicação de conceitos de outras áreas.',
    levels: [
      {
        level: 1,
        points: P(1),
        summary:
          'Tangência ao tema OU Texto composto por aglomerado caótico de palavras OU Traços constantes de outros tipos textuais',
        rationale: {
          op: 'OR',
          multiple: true,
          items: [
            { id: 'c2_l1_tangencia', label: 'Tangência ao tema' },
            { id: 'c2_l1_aglomerado', label: 'Texto composto por aglomerado caótico de palavras' },
            { id: 'c2_l1_outros_tipos', label: 'Traços constantes de outros tipos textuais' },
          ],
        },
      },
      {
        level: 2,
        points: P(2),
        summary:
          'Abordagem completa do tema E 3 partes do texto (2 delas embrionárias) OU conclusão finalizada por frase incompleta //Redação com muitas cópias',
        rationale: {
          op: 'OR',
          items: [
            {
              op: 'AND',
              items: [{ id: 'c2_l2_3partes_2_embrionarias', label: '3 partes do texto (2 delas embrionárias)' }],
            },
            { id: 'c2_l2_conclusao_incompleta', label: 'Conclusão finalizada por frase incompleta' },
            { id: 'c2_l2_muitas_copias', label: 'Redação com muitas cópias — não deve ultrapassar este nível' },
          ],
        },
      },
      {
        level: 3,
        points: P(3),
        summary:
          'Abordagem completa do tema E 3 partes do texto (1 delas embrionárias) E repertório baseado nos textos motivadores E/OU repertório não legitimado E/OU repertório legitimado MAS não pertecente ao tema',
        rationale: {
          op: 'AND',
          items: [
            { id: 'c2_l3_3partes_1_embrionaria', label: '3 partes do texto (1 delas embrionárias)' },
            {
              op: 'OR',
              multiple: true,
              items: [
                { id: 'c2_l3_repertorio_baseado_motivadores', label: 'Repertório baseado nos textos motivadores' },
                { id: 'c2_l3_repertorio_nao_legitimado', label: 'Repertório não legitimado' },
                {
                  id: 'c2_l3_repertorio_legitimado_nao_pertinente',
                  label: 'Repertório legitimado MAS não pertecente ao tema',
                },
              ],
            },
          ],
        },
      },
      {
        level: 4,
        points: P(4),
        summary:
          'Abordagem completa do tema E 3 partes do texto (nenhuma embrionária) E repertório legitimado E pertinente ao tema, SEM uso produtivo.',
        rationale: {
          op: 'AND',
          items: [
            { id: 'c2_l4_3partes_nenhuma_embrionaria', label: '3 partes do texto (nenhuma embrionária)' },
            { id: 'c2_l4_repertorio_legitimado', label: 'Repertório legitimado' },
            { id: 'c2_l4_pertinente_sem_produtivo', label: 'Pertinente ao tema, SEM uso produtivo' },
          ],
        },
      },
      {
        level: 5,
        points: P(5),
        summary:
          'Abordagem completa do tema E 3 partes do texto (nenhuma embrionária) E repertório legitimado E pertinente ao tema, COM uso produtivo.',
        rationale: {
          op: 'AND',
          items: [
            { id: 'c2_l5_3partes_nenhuma_embrionaria', label: '3 partes do texto (nenhuma embrionária)' },
            { id: 'c2_l5_repertorio_legitimado', label: 'Repertório legitimado' },
            { id: 'c2_l5_pertinente_com_produtivo', label: 'Pertinente ao tema, COM uso produtivo' },
          ],
        },
      },
    ],
  },
  {
    key: 'C3',
    title: 'Competência 3',
    description: 'Organização e defesa de argumentos.',
    levels: [
      { level: 0, points: P(0), summary: 'Aglomerado caótico de palavras' },
      { level: 1, points: P(1), summary: 'Projeto de texto sem foco temático ou distorcido' },
      {
        level: 2,
        points: P(2),
        summary:
          'projeto de texto com MUITAS falhas E sem desenvolvimento ou desenvolvimento de apenas uma informação // Contradição grave',
        rationale: {
          op: 'OR',
          items: [
            {
              op: 'AND',
              items: [
                { id: 'c3_l2_muitas_falhas', label: 'MUITAS falhas' },
                { id: 'c3_l2_sem_desenvolvimento', label: 'Sem desenvolvimento OU desenvolvimento de apenas uma informação' },
              ],
            },
            { id: 'c3_l2_contradicao_grave', label: 'Contradição grave — não deve ultrapassar este nível' },
          ],
        },
      },
      {
        level: 3,
        points: P(3),
        summary:
          'projeto de texto com ALGUMAS falhas E Desenvolvimento de informações, fatos e opiniões com ALGUMAS lacunas',
      },
      {
        level: 4,
        points: P(4),
        summary:
          'projeto de texto com POUCAS falhas E Desenvolvimento de informações, fatos e opiniões com POUCAS lacunas',
      },
      {
        level: 5,
        points: P(5),
        summary: 'Projeto de texto estratégico E Desenvolvimento de informações, fatos e opiniões em TODO o texto.',
      },
    ],
  },
  {
    key: 'C4',
    title: 'Competência 4',
    description: 'Conhecimento dos mecanismos linguísticos para a argumentação (coesão).',
    levels: [
      { level: 0, points: P(0), summary: 'Ausência de articulação: palavras E/OU períodos desconexos' },
      {
        level: 1,
        points: P(1),
        summary: 'Presença RARA de elementos coesivos intra E/OU interparágrafos E/OU EXCESSIVAS repetições E/OU EXCESSIVAS inadequações',
        rationale: {
          op: 'OR',
          multiple: true,
          items: [
            { id: 'c4_l1_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos' },
            { id: 'c4_l1_excessivas_repeticoes', label: 'EXCESSIVAS repetições' },
            { id: 'c4_l1_excessivas_inadequacoes', label: 'EXCESSIVAS inadequações' },
          ],
        },
      },
      {
        level: 2,
        points: P(2),
        summary: 'Presença PONTUAL de elementos coesivos intra E/OU interparágrafos E/OU MUITAS repetições E/OU MUITAS inadequações //Texto monobloco',
        rationale: {
          op: 'OR',
          multiple: true,
          items: [
            { id: 'c4_l2_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos (PONTUAL)' },
            { id: 'c4_l2_muitas_repeticoes', label: 'MUITAS repetições' },
            { id: 'c4_l2_muitas_inadequacoes', label: 'MUITAS inadequações' },
            { id: 'c4_l2_texto_monobloco', label: 'Texto monobloco — não deve ultrapassar este nível' },
          ],
        },
      },
      {
        level: 3,
        points: P(3),
        summary: 'Presença REGULAR de elementos coesivos intra E/OU interparágrafos E/OU ALGUMAS repetições E/OU ALGUMAS inadequações',
        rationale: {
          op: 'OR',
          multiple: true,
          items: [
            { id: 'c4_l3_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos (REGULAR)' },
            { id: 'c4_l3_algumas_repeticoes', label: 'ALGUMAS repetições' },
            { id: 'c4_l3_algumas_inadequacoes', label: 'ALGUMAS inadequações' },
          ],
        },
      },
      {
        level: 4,
        points: P(4),
        summary: 'Presença CONSTANTE de elementos coesivos intra E/OU interparágrafos E/OU POUCAS repetições E/OU POUCAS inadequações',
        rationale: {
          op: 'OR',
          multiple: true,
          items: [
            { id: 'c4_l4_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos (CONSTANTE)' },
            { id: 'c4_l4_poucas_repeticoes', label: 'POUCAS repetições' },
            { id: 'c4_l4_poucas_inadequacoes', label: 'POUCAS inadequações' },
          ],
        },
      },
      {
        level: 5,
        points: P(5),
        summary: 'Presença EXPRESSIVA de elementos coesivos intra E/OU interparágrafos E/OU RARAS ou AUSENTES repetições E/OU SEM inadequações',
        rationale: {
          op: 'OR',
          multiple: true,
          items: [
            { id: 'c4_l5_intra_inter', label: 'Elementos coesivos intra E/OU interparágrafos (EXPRESSIVA)' },
            { id: 'c4_l5_raras_ausentes_repeticoes', label: 'RARAS ou AUSENTES repetições' },
            { id: 'c4_l5_sem_inadequacoes', label: 'SEM inadequações' },
          ],
        },
      },
    ],
  },
  {
    key: 'C5',
    title: 'Competência 5',
    description: 'Elaboração de proposta de intervenção social para o problema abordado, respeitando os direitos humanos.',
    levels: [
      {
        level: 0,
        points: P(0),
        summary: 'Ausência de proposta OU Proposta de intervenção que desrespeita os direitos humanos OU proposta de intervenção não relacionada ao assunto',
        rationale: {
          op: 'OR',
          multiple: true,
          items: [
            { id: 'c5_l0_ausencia', label: 'Ausência de proposta' },
            { id: 'c5_l0_desrespeita_dh', label: 'Proposta de intervenção que desrespeita os direitos humanos' },
            { id: 'c5_l0_nao_relacionada', label: 'Proposta de intervenção não relacionada ao assunto' },
          ],
        },
      },
      {
        level: 1,
        points: P(1),
        summary: 'Tangênciamento ao tema OU Apenas elementos nulos OU 1 elemento válido',
        rationale: {
          op: 'OR',
          multiple: true,
          items: [
            { id: 'c5_l1_tangenciamento', label: 'Tangênciamento ao tema' },
            { id: 'c5_l1_elementos_nulos', label: 'Apenas elementos nulos' },
            { id: 'c5_l1_um_elemento_valido', label: '1 elemento válido' },
          ],
        },
      },
      {
        level: 2,
        points: P(2),
        summary: '2 elementos válidos //Estrutura CONDICIONAL com dois ou mais elementos válidos',
        rationale: {
          op: 'OR',
          items: [
            { id: 'c5_l2_dois_elementos', label: '2 elementos válidos' },
            { id: 'c5_l2_condicional', label: 'Estrutura CONDICIONAL com dois ou mais elementos válidos' },
          ],
        },
      },
      { level: 3, points: P(3), summary: '3 elementos válidos' },
      { level: 4, points: P(4), summary: '4 elementos válidos' },
      { level: 5, points: P(5), summary: '5 elementos válidos' },
    ],
  },
];
