import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const createEvaluation = async (data) => {
  const res = await axios.post(`${API_URL}/evaluations`, data);
  return res.data;
};

export default {
  createEvaluation
};
