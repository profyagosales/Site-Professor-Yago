import { api } from '@/lib/api';

export const listThemes = (params) => api.get('/api/essays/themes', { params });
export const createTheme = (data) => api.post('/api/essays/themes', data);
export const updateTheme = (id, data) => api.patch(`/api/essays/themes/${id}`, data);

export const uploadEssay = (formData) =>
  api.post('/api/essays', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const listEssays = (params) => api.get('/api/essays', { params });
export const gradeEssay = (id, formData) =>
  api.patch(`/api/essays/${id}/grade`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const saveAnnotations = (id, data) =>
  api.patch(`/api/essays/${id}/annotations`, data);

export default {
  listThemes,
  createTheme,
  updateTheme,
  uploadEssay,
  listEssays,
  gradeEssay,
  saveAnnotations,
};
