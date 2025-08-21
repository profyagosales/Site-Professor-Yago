import api, { pickData, toArray } from '@/services/api';

export const createGabarito = async (data) => {
  const res = await api.post('/gabaritos', data);
  return res.data;
};

export default {
  createGabarito,
};
