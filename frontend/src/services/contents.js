import api, { toArray } from '@api';

const arrify = (v) => {
  const r = toArray ? toArray(v) : undefined;
  return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
};

export async function listContents() {
  const r = await api.get('/contents');
  return arrify(r?.data?.data ?? r?.data);
}

export async function createContent(payload) {
  return (await api.post('/contents', payload))?.data;
}

export async function listUpcomingContents({ teacherId, daysAhead = 14, limit = 5 }) {
  if (!teacherId) return [];
  const { data } = await api.get(
    `/teachers/${teacherId}/contents/upcoming`,
    { params: { daysAhead, limit } }
  );
  return data;
}

export async function quickCreateContent(payload) {
  const { data } = await api.post('/contents', payload);
  return data;
}

export async function updateContent(id, payload) {
  return (await api.patch(`/contents/${id}`, payload))?.data;
}

export async function deleteContent(id) {
  return (await api.delete(`/contents/${id}`))?.data;
}

export default {
  listContents,
  createContent,
  updateContent,
  deleteContent,
  listUpcomingContents,
  quickCreateContent,
};
