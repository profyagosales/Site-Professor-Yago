import { api } from '@/services/api';

export type StudentBimesterGrades = {
  classId: string;
  studentId: string;
  year: number;
  bimester: number;
  activities: Array<{
    activityId: string;
    label: string;
    value: number;
    points: number;
  }>;
  totalBimester: number;
  missingFor5: number;
  annualTotal: number;
  missingFor20: number;
  totalsByBimester: Record<number, number>;
};

export async function getStudentGrades({ classId, studentId, year, bimester }: {
  classId: string;
  studentId: string;
  year?: number;
  bimester?: number;
}): Promise<StudentBimesterGrades | null> {
  const params: Record<string, unknown> = {};
  if (year) params.year = year;
  if (bimester) params.bimester = bimester;
  const response = await api.get(`/classes/${classId}/students/${studentId}/grades`, {
    params,
    meta: { noCache: true },
  });
  return response?.data?.data ?? null;
}

export default {
  getStudentGrades,
};
