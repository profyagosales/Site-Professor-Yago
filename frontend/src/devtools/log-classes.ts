import api from '@/services/api';

export async function logClassesOnce() {
  try {
    const r = await api.get('/professor/classes');
    // eslint-disable-next-line no-console
    console.info('[classes]', r.status, Array.isArray(r.data) ? `items: ${r.data.length}` : r.data);
    return r;
  } catch (e: any) {
    const s = e?.response?.status;
    // eslint-disable-next-line no-console
    console.warn('[classes][error]', s, e?.response?.data ?? e?.message);
    throw e;
  }
}
