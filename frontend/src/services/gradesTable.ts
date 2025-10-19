import { api } from '@/services/api';

export type GradesTableColumn = {
  key: string;
  title: string;
  width?: number;
};

export type GradesTableRow = {
  studentId: string;
  studentName: string;
  values: Record<string, number>;
};

export type GradesTableResponse = {
  columns: GradesTableColumn[];
  rows: GradesTableRow[];
  meta: {
    year: number;
    bimesters: number[];
    mode: 'detail' | 'summary';
  };
};

type TableParams = {
  classId: string;
  year?: number;
  bimesters?: number[];
};

export async function getGradesTable({ classId, year, bimesters }: TableParams): Promise<GradesTableResponse> {
  const params: Record<string, unknown> = {};
  if (year) params.year = year;
  if (bimesters && bimesters.length) {
    params.bimesters = bimesters.join(',');
  }
  const response = await api.get(`/classes/${classId}/grades/table`, {
    params,
    meta: { noCache: true },
  });
  const payload = response?.data?.data ?? response?.data;
  return payload as GradesTableResponse;
}

export async function exportGradesPdf({ classId, year, bimesters }: TableParams) {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (bimesters && bimesters.length) params.set('bimesters', bimesters.join(','));
  const query = params.toString();
  const url = `/api/classes/${classId}/grades/export/pdf${query ? `?${query}` : ''}`;
  window.open(url, '_blank', 'noopener');
}

export default {
  getGradesTable,
  exportGradesPdf,
};
