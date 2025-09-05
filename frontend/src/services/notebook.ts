import { api, pickData } from '@/services/api';

export interface NotebookEntry {
  _id: string;
  title: string;
  date: string;
  alunos_feitos: number;
  total_alunos: number;
  percentual: number;
  content?: string;
  classId: string;
  term: number;
}

export interface NotebookSummary {
  totalValue: number;
  seenCount: number;
  totalItems: number;
  items: Array<{
    id: string;
    title: string;
    date: string;
    done: boolean;
  }>;
}

export interface NotebookParams {
  classId: string;
  term: number;
  studentId?: string;
}

/**
 * Busca registros do caderno para uma turma e bimestre específicos
 */
export async function getNotebookEntries(
  classId: string, 
  term: number
): Promise<NotebookEntry[]> {
  const data = await api.get(`/caderno/${classId}/${term}`).then(pickData);
  return Array.isArray(data) ? data : data?.data || [];
}

/**
 * Busca resumo do caderno para um aluno específico
 */
export async function getStudentNotebookSummary(
  studentId: string, 
  term: number
): Promise<NotebookSummary> {
  const data = await api.get(`/students/${studentId}/notebook`, { 
    params: { term } 
  }).then(pickData);
  return data;
}

/**
 * Busca configuração do caderno para uma turma
 */
export async function getNotebookConfig(classId: string) {
  return api.get(`/caderno/config/${classId}`).then(pickData);
}

/**
 * Atualiza configuração do caderno para uma turma
 */
export async function updateNotebookConfig(classId: string, totals: any) {
  return api.put(`/caderno/config/${classId}`, { totals }).then(pickData);
}

/**
 * Cria um novo registro no caderno
 */
export async function createNotebookEntry(data: {
  classId: string;
  title: string;
  content?: string;
  date: string;
  term: number;
}) {
  return api.post('/caderno', data).then(pickData);
}

/**
 * Atualiza presença dos alunos em um registro do caderno
 */
export async function updateNotebookPresence(
  entryId: string, 
  presentStudentIds: string[]
) {
  return api.put(`/caderno/${entryId}`, { presentStudentIds }).then(pickData);
}

/**
 * Calcula estatísticas de presença do aluno
 */
export function calculateStudentAttendance(
  entries: NotebookEntry[], 
  studentId: string
) {
  const totalEntries = entries.length;
  const presentEntries = entries.filter(entry => 
    entry.alunos_feitos > 0 // Assumindo que se alunos_feitos > 0, o aluno estava presente
  ).length;
  
  const attendanceRate = totalEntries > 0 ? (presentEntries / totalEntries) * 100 : 0;
  
  return {
    totalEntries,
    presentEntries,
    absentEntries: totalEntries - presentEntries,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
  };
}

/**
 * Formata data para exibição
 */
export function formatNotebookDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata percentual para exibição
 */
export function formatAttendancePercentage(percentual: number): string {
  return `${Math.round(percentual)}%`;
}

export default {
  getNotebookEntries,
  getStudentNotebookSummary,
  getNotebookConfig,
  updateNotebookConfig,
  createNotebookEntry,
  updateNotebookPresence,
  calculateStudentAttendance,
  formatNotebookDate,
  formatAttendancePercentage,
};
