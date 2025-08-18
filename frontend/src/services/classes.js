import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const getClasses = async () => {
  const res = await axios.get(`${API_URL}/classes`);
  return res.data;
};

export default {
  getClasses,
};
