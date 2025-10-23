export type EssayModel = 'ENEM' | 'PAS/UnB';

export type AnnotationKind = 'argument' | 'grammar' | 'cohesion' | 'presentation' | 'general';

export interface Annotation {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: AnnotationKind;
  text: string;
}

export interface EssayPdfData {
  student: {
    name: string;
    avatarUrl?: string;
    avatarDataUri?: string;
    classLabel?: string;
    bimester?: number | string | null;
    bimesterLabel?: string | null;
  };
  professor?: { name: string; initials: string };
  klass: { label: string };
  termLabel: string;
  deliveredAt?: string;
  theme?: string;
  model: EssayModel;
  finalScore: string;
  score?: {
    finalFormatted: string;
    final?: number | null;
  };
  pagesPng: string[];
  annotations: Annotation[];
  enem?: {
    levels: [number, number, number, number, number];
    reasons: string[][];
  };
  pas?: {
    apresentacao: number;
    generoTextual: number;
    coesaoCoerencia: number;
    conteudo: number;
    nl: number;
    erros: {
      grafiaAcentuacao: number;
      pontuacaoMorfossintaxe: number;
      propriedadeVocabular: number;
    };
  };
}
