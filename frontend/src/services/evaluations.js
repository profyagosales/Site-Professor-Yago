import api, { pickData } from '@api';

export const createEvaluation = (data) =>
  api.post('/evaluations', data).then(pickData);

export default {
  createEvaluation,
};

