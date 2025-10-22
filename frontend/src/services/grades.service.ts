import { api } from '@/services/api';

export type Term = 1 | 2 | 3 | 4;

export type GradeSchemeActivity = { id: string; label: string; maxPoints: number };

export async function getGradeScheme(params: { classId: string; term: Term; year?: number }) {
  const { classId, term } = params;
  const year = params.year ?? new Date().getFullYear();
  const res = await api.get('/grade-activities', { params: { classId, year, bimester: term } });
  const list: any[] = Array.isArray(res?.data?.data) ? res.data.data : [];
  return list.map((a) => ({ id: String(a.id ?? a._id), label: a.label, maxPoints: Number(a.value ?? a.points ?? 0) })) as GradeSchemeActivity[];
}

export type ActivityEntriesRow = {
  student: { id: string; name: string; photo: string | null; roll: number | null; email: string | null };
  entries: Array<{ activityId: string; score: number }>;
};

export async function getActivityEntries(params: { classId: string; term: Term; year?: number }) {
  const year = params.year ?? new Date().getFullYear();
  const res = await api.get('/grades/activity-entries', { params: { classId: params.classId, term: params.term, year } });
  return (res?.data?.data ?? res?.data) as { classId: string; year: number; term: Term; activities: GradeSchemeActivity[]; rows: ActivityEntriesRow[] };
}

export async function upsertActivityEntriesBulk(payload: { classId: string; term: Term; activityId: string; items: Array<{ studentId: string; score: number }> }) {
  const res = await api.post('/grades/activity-entries/bulk', payload);
  return res?.data?.data ?? res?.data;
}

export async function getStudentTermGrades(params: { studentId: string; classId: string; term: Term; year?: number }) {
  const year = params.year ?? new Date().getFullYear();
  const res = await api.get(`/students/${params.studentId}/grades`, { params: { classId: params.classId, term: params.term, year } });
  return res?.data?.data ?? res?.data;
}

export default { getGradeScheme, getActivityEntries, upsertActivityEntriesBulk, getStudentTermGrades };

