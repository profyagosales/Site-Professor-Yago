import api, { pickData } from '@/services/api';

export const createGabarito = (data) =>
  api.post('/gabaritos', data).then(pickData);

export default {
  createGabarito,
};

