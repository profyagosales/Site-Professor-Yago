import { api } from '@/lib/api';

export async function createGabarito(formData) {
  const res = await api.post('/api/gabaritos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'arraybuffer',
  });
  return res.data;
}

export default { createGabarito };
