export type AnnotationType = 'highlight' | 'pen' | 'box' | 'strike' | 'comment';

export interface AnnotationBase {
  id: string;
  page: number; // 1-based
  type: AnnotationType;
  createdAt: string;
  updatedAt?: string;
}

export interface HighlightAnno extends AnnotationBase {
  type: 'highlight';
  rects: { x: number; y: number; w: number; h: number }[]; // normalized 0..1
  opacity: number; // default 0.3
  color?: string; // default yellow
}

export interface PenAnno extends AnnotationBase {
  type: 'pen';
  points: { x: number; y: number }[]; // normalized
  width: number; // px relative to scale
  color?: string;
}

export interface BoxAnno extends AnnotationBase {
  type: 'box';
  rect: { x: number; y: number; w: number; h: number };
  strokeWidth: number;
  color?: string;
}

export interface StrikeAnno extends AnnotationBase {
  type: 'strike';
  from: { x: number; y: number };
  to: { x: number; y: number };
  strokeWidth: number;
  color?: string;
}

export interface CommentAnno extends AnnotationBase {
  type: 'comment';
  at: { x: number; y: number };
  text: string;
}

export type Anno = HighlightAnno | PenAnno | BoxAnno | StrikeAnno | CommentAnno;

export interface RedacaoAnnotations {
  redacaoId: string;
  annos: Anno[];
}
