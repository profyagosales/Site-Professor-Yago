import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const createVisto = async (data) => {
  const res = await axios.post(`${API_URL}/caderno`, data);
  return res.data;
};

export const updateVisto = async (id, students) => {
  const res = await axios.put(`${API_URL}/caderno/${id}`, { students });
  return res.data;
};

export const getVistos = async (classId, bimester) => {
  const res = await axios.get(`${API_URL}/caderno/${classId}/${bimester}`);
  return res.data;
};

export default {
  createVisto,
  updateVisto,
  getVistos
};
