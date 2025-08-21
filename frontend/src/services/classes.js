import api, { pickData, toArray } from '@/services/api';

export const getClasses = async () => {
  const res = await api.get('/classes');
  return res.data;
};

export default {
  getClasses,
};
