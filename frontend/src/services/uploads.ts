import { api } from '@/services/api';

export async function uploadEssay(formData: FormData) {
  // Espera fields: file, studentId, topic, classId (opcional), fileUrl
  // POST /api/uploads/essay (sem Content-Type; deixe o browser definir o boundary)
  const res = await api.post('/uploads/essay', formData, {
    headers: {
      // Não definir Content-Type - deixar o browser definir automaticamente com boundary
    }
  });
  return res.data;
}

export default { uploadEssay };
