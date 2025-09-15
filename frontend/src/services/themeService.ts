import { api } from './api';

export interface Theme {
  _id: string;
  title: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string; // backend pode não enviar updatedAt sempre
  createdBy?: { _id: string; name: string };
}

export interface PaginatedThemes {
  themes: Theme[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const getThemes = async (params: { page?: number; limit?: number; query?: string; active?: boolean } = {}): Promise<PaginatedThemes> => {
  const response = await api.get('/themes', { params });
  return response.data;
};

export const getThemeById = async (id: string): Promise<Theme> => {
  const response = await api.get(`/themes/${id}`);
  return response.data;
};

export const createTheme = async (data: { title: string; active?: boolean }): Promise<Theme> => {
  const response = await api.post('/themes', data);
  return response.data;
};

export const updateTheme = async (id: string, data: { title?: string; active?: boolean }): Promise<Theme> => {
  const response = await api.put(`/themes/${id}`, data);
  return response.data;
};
export const archiveTheme = async (id: string): Promise<Theme> => {
  const response = await api.post(`/themes/${id}/archive`);
  return response.data;
};

export const restoreTheme = async (id: string): Promise<Theme> => {
  const response = await api.post(`/themes/${id}/restore`);
  return response.data;
};
