export type EssayStatus = 'pending' | 'ready' | 'processing' | 'failed' | 'corrected';

// Minimal student summary used across correction flows
export interface StudentSummary {
  id?: string | null;
  name: string;
  avatarUrl?: string | null; // normalizado em essays.service.ts
  photoUrl?: string | null;  // mantido para retrocompatibilidade
  image?: { url?: string | null } | null; // fontes alternativas
  classId?: string | null;
  className?: string | null;
}

export interface Essay {
  id: string;
  studentName: string;
  student?: StudentSummary | null; // novo: objeto normalizado (avatarUrl, etc.)
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
  studentAvatarUrl?: string | null; // novo: atalho normalizado para a lista
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
