import api, { pickData } from '@/services/api';

export const getClasses = () => api.get('/classes').then(pickData);

export default {
  getClasses,
};

