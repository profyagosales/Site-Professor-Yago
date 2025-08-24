import { api } from '@/lib/api';

export const listThemes = (params) => api.get('/essays/themes', { params });
export const createTheme = (data) => api.post('/essays/themes', data);
export const updateTheme = (id, data) => api.patch(`/essays/themes/${id}`, data);

export const uploadEssay = (formData) =>
  api.post('/essays', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const listEssays = (params) => api.get('/essays', { params });
export const gradeEssay = (id, formData) =>
  api.patch(`/essays/${id}/grade`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const saveAnnotations = (id, data) =>
  api.patch(`/essays/${id}/annotations`, data);

export default {
  listThemes,
  createTheme,
  updateTheme,
  uploadEssay,
  listEssays,
  gradeEssay,
  saveAnnotations,
};
