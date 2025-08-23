export type RedactionModel = 'ENEM' | 'PAS';
export type RedactionStatus = 'uploaded' | 'correcting' | 'graded' | 'returned';

export interface RedactionTheme { id: string; name: string; createdAt: string; }

export interface RedactionSubmission {
  id: string;
  studentId: string;
  classId: string;
  model: RedactionModel;
  themeId: string | null;
  themeText?: string; // quando “tema não está na lista”
  bimester: 1|2|3|4;
  fileUrl: string; // PDF
  weightOnBimester: number; // 0..10
  // notas “reais”:
  enemScore?: number; // 0..1000
  pas: { NC?: number; NE?: number; NL?: number } | null;
  // nota convertida p/ bimestre:
  bimesterScore?: number; // 0..10
  status: RedactionStatus;
  createdAt: string;
  updatedAt: string;
}
