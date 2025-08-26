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
}

export interface EssaysPage {
  items: Essay[];
  page: number;
  pageSize: number;
  total: number;
}
