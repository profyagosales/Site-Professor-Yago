export type EssayStatus = 'pending' | 'corrected';

export interface Essay {
  id: string;
  studentName: string;
  className: string | null;
  classId?: string | null;
  theme: string;
  topic?: string;
  submittedAt: string | null;
  sentAt?: string | null;
  fileUrl?: string | null;
  correctedUrl?: string | null;
  score?: number | null;
  comments?: string | null;
  type?: string | null;
  bimester?: number | null;
  raw?: any;
}

export interface EssaysPage {
  items: Essay[];
  page: number;
  pageSize: number;
  total: number;
}

// Simple annotation type used in correction UI
export interface Annotation {
  color: string;         // e.g., 'green' (Erro), 'blue' (Observação)
  label: string;         // short label like 'Erro' or 'Obs'
  comment?: string;      // optional textual note
  selection?: any;       // reserved for future selection ranges
  bbox?: { page: number; x: number; y: number; w: number; h: number } | null; // bounding box on PDF page
}
