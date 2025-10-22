import type { HighlightCategoryKey } from '@/constants/annotations';

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AnnotationItem = {
  id: string;
  page: number; // 1-based index
  rects: NormalizedRect[];
  category: HighlightCategoryKey;
  comment: string;
  color: string;
  number: number;
  createdAt?: string;
  updatedAt?: string;
};
