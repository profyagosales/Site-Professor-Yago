import { api } from './api';

export interface Class {
  _id: string;
  name: string;
  year: number;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedClasses {
  classes: Class[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const getClasses = async (params: { page?: number; limit?: number; query?: string } = {}): Promise<PaginatedClasses> => {
  const response = await api.get('/classes', { params });
  return response.data;
};

export const getClassById = async (id: string): Promise<Class> => {
  const response = await api.get(`/classes/${id}`);
  return response.data;
};

export const createClass = async (data: { name: string; year: number }): Promise<Class> => {
  const response = await api.post('/classes', data);
  return response.data;
};

export const updateClass = async (id: string, data: { name?: string; year?: number }): Promise<Class> => {
  const response = await api.put(`/classes/${id}`, data);
  return response.data;
};

export const deleteClass = async (id: string): Promise<void> => {
  await api.delete(`/classes/${id}`);
};
