import { api } from '@/services/api';
import { fetchGradeScheme } from '@/services/gradeScheme';

export type Term = 1 | 2 | 3 | 4;

export type GradeSchemeActivity = { id: string; label: string; maxPoints: number };

export async function getGradeScheme(params: { classId: string; term: Term; year?: number }) {
  const { classId, term } = params;
  const year = params.year ?? new Date().getFullYear();

  try {
    const res = await api.get('/grade-activities', { params: { classId, year, bimester: term } });
    const list: any[] = Array.isArray(res?.data?.data) ? res.data.data : [];
    if (list.length) {
      return list.map((a) => ({
        id: String(a.id ?? a._id),
        label: a.label ?? a.name ?? 'Atividade',
        maxPoints: Number(a.value ?? a.points ?? a.maxPoints ?? 0),
      })) as GradeSchemeActivity[];
    }
  } catch (error) {
    // Continua para fallback
  }

  try {
    const scheme = await fetchGradeScheme({ classId, year });
    const items = scheme.byBimester?.[term]?.items ?? [];
    return items.map((item) => ({
      id: String(item.id ?? item.name ?? item.label ?? `${term}-${item.order}`),
      label: item.label ?? item.name ?? 'Atividade',
      maxPoints: Number(item.points ?? item.maxPoints ?? 0),
    }));
  } catch (error) {
    return [];
  }
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
