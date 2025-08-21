import api, { pickData } from '@/services/api';

export const createEvaluation = (data) =>
  api.post('/evaluations', data).then(pickData);

export default {
  createEvaluation,
};

