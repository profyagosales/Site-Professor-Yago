import { api } from '@/services/api';

export type GradeActivity = {
  id: string;
  classId: string;
  year: number;
  bimester: number;
  label: string;
  value: number;
  order: number;
  active: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GradeActivityGrade = {
  studentId: string;
  points: number;
  gradedAt?: string;
};

type ListParams = {
  classId: string;
  year?: number;
  bimester?: number;
};

export async function listGradeActivities({ classId, year, bimester }: ListParams): Promise<GradeActivity[]> {
  const params: Record<string, unknown> = { classId };
  if (year) params.year = year;
  if (bimester) params.bimester = bimester;
  const response = await api.get('/grade-activities', { params, meta: { noCache: true } });
  const payload = response?.data?.data ?? response?.data ?? [];
  if (!Array.isArray(payload)) return [];
  return payload.map((item: any) => ({
    id: String(item.id ?? item._id ?? ''),
    classId: String(item.classId ?? classId),
    year: Number(item.year ?? year ?? new Date().getFullYear()),
    bimester: Number(item.bimester ?? bimester ?? 1),
    label: String(item.label ?? ''),
    value: Number(item.value ?? 0),
    order: Number(item.order ?? 0),
    active: item.active !== false,
    createdBy: item.createdBy ? String(item.createdBy) : undefined,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
  })).filter((item) => item.id);
}

export async function createGradeActivity(payload: {
  classId: string;
  year: number;
  bimester: number;
  label: string;
  value: number;
  order?: number;
}): Promise<GradeActivity> {
  const response = await api.post('/grade-activities', payload, { meta: { noCache: true } });
  return response?.data?.data ?? response?.data;
}

export async function updateGradeActivity(id: string, payload: Partial<Omit<GradeActivity, 'id' | 'classId'>>) {
  const response = await api.put(`/grade-activities/${id}`, payload, { meta: { noCache: true } });
  return response?.data?.data ?? response?.data;
}

export async function deleteGradeActivity(id: string) {
  const response = await api.delete(`/grade-activities/${id}`, { meta: { noCache: true } });
  return response?.data?.data ?? response?.data;
}

export async function bulkSetActivityGrades(activityId: string, grades: GradeActivityGrade[]) {
  const response = await api.post(`/grade-activities/${activityId}/grades`, { grades }, { meta: { noCache: true } });
  return response?.data?.data ?? response?.data;
}

export default {
  listGradeActivities,
  createGradeActivity,
  updateGradeActivity,
  deleteGradeActivity,
  bulkSetActivityGrades,
};
