import { api } from '@/services/api';
import type { Student } from '@/types/student';
// Integra funções do módulo JS para compatibilidade com chamadas existentes
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - importar módulo JS sem tipos
import * as studentsJs from '@/services/students.js';

export async function searchStudents(params: { q?: string; classId?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get('/students2', { params });
  return data as { items: any[]; page: number; pageSize: number; total: number };
}

export async function getStudent(id: string) {
  const { data } = await api.get(`/students2/${id}`);
  return data as { student: any; stats: { totalEssays: number; averageScore: number | null } };
}

export async function getStudentEssays(id: string, params: { status?: 'pending' | 'corrected'; page?: number; pageSize?: number }) {
  const { data } = await api.get(`/students2/${id}/essays`, { params });
  return data as { items: any[]; page: number; pageSize: number; total: number };
}
// Reexports para compatibilidade
export const list = (studentsJs as any).list ?? (studentsJs as any).listStudents as (classId: string) => Promise<any>;
export const create = studentsJs.create as (classId: string, payload: any) => Promise<any>;
export const update = studentsJs.update as (classId: string, studentId: string, payload: any) => Promise<any>;
export const remove = studentsJs.remove as (classId: string, studentId: string) => Promise<any>;

const defaultExport = { searchStudents, getStudent, getStudentEssays, list, create, update, remove };
export default defaultExport;
