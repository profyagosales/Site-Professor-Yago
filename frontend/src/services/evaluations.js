import { api, pickData } from '@/lib/http';

export const createEvaluation = ({ name, value, bimester, classes }) =>
  api
    .post('/evaluations', { name, value, bimester, classes })
    .then(pickData);

export default {
  createEvaluation,
};

