import api, { pickData, toArray } from '@/services/api';

export const createEvaluation = async (data) => {
  const res = await api.post('/evaluations', data);
  return res.data;
};

export default {
  createEvaluation
};
