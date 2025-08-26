export type EssayStatus = 'pending' | 'corrected';

export interface Essay {
  id: string;
  studentName: string;
  className: string;
  topic: string;
  submittedAt: string; // ISO
  fileUrl: string;     // link para download/visualização
  score?: number;      // só em corrigidas
  comments?: string;   // só em corrigidas
  type?: 'ENEM' | 'PAS';
  bimester?: number;
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
