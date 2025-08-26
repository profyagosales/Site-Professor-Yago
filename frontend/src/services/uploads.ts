import { api } from '@/services/api';

export async function uploadEssay(formData: FormData) {
  // Espera fields: file, studentId, topic, classId (opcional)
  const res = await api.post('/uploads/essay', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export default { uploadEssay };
