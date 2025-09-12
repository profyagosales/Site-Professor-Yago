import { api } from './api';
import { Class } from './classService';

export interface Student {
  _id: string;
  name: string;
  email: string;
  active: boolean;
  classId?: Class; // A turma pode ser populada
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedStudents {
  users: Student[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const getStudents = async (params: { page?: number; limit?: number; query?: string; classId?: string } = {}): Promise<PaginatedStudents> => {
  const response = await api.get('/students', { params });
  return response.data;
};

export const createStudent = async (data: { name: string; email: string; password?: string; active: boolean; classId: string }): Promise<Student> => {
  const response = await api.post('/students', data);
  return response.data;
};

export const updateStudent = async (id: string, data: { name?: string; email?: string; password?: string; active?: boolean; classId?: string }): Promise<Student> => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (id: string): Promise<void> => {
  await api.delete(`/students/${id}`);
};
