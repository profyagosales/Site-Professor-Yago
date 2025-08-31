import type { HighlightCategoryId } from './palette';

export type Highlight = {
  id: string;
  pageNumber: number;
  rects: Array<{ left:number; top:number; width:number; height:number }>;
  color: string;   // hex base (p.ex. "#22C55E")
  fill: string;    // hex com alpha (p.ex. "#22C55E59")
  category: HighlightCategoryId;     // <- NOVO: obrigatório
  label: string;                     // denormalizado para facilitar listagem
  comment: string;                   // obrigatório
  createdAt: string;
  author?: { id?: string; name?: string } | null;
  // campos legados usados pelo PdfHighlighter
  selection?: any;
  bbox?: { page: number; x: number; y: number; w: number; h: number };
};
