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
  student: { name: string; avatarUrl?: string };
  professor?: { name: string; initials?: string };
  klass: { label: string };
  termLabel: string;
  deliveredAt?: string;
  theme?: string;
  model: EssayModel;
  finalScore: string;
  pagesPng: string[];
  annotations: Annotation[];
}
