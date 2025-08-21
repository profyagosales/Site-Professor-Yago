import api from '@api';

export const createEvaluation = async (data) => {
  const res = await api.post('/evaluations', data);
  return res.data;
};

export default {
  createEvaluation
};
