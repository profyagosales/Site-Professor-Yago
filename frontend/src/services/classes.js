import api from '@api';

export async function listClasses() {
  const r = await api.get('/classes');
  return Array.isArray(r?.data?.data)
    ? r.data.data
    : (Array.isArray(r?.data) ? r.data : []);
}

export async function createClass(payload) {
  return (await api.post('/classes', payload))?.data;
}

export async function updateClass(id, payload) {
  return (await api.put(`/classes/${id}`, payload))?.data;
}

export async function getClass(id) {
  return (await api.get(`/classes/${id}`))?.data?.data || {};
}

export async function deleteClass(id) {
  return (await api.delete(`/classes/${id}`))?.data;
}

export default {
  listClasses,
  createClass,
  updateClass,
  getClass,
  deleteClass,
};
