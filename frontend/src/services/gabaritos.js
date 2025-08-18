import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const createGabarito = async (data) => {
  const res = await axios.post(`${API_URL}/gabaritos`, data);
  return res.data;
};

export default {
  createGabarito,
};
