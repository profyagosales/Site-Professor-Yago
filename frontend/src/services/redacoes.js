import { api } from '@/lib/api';

// Nota: fluxo de envio legado permanece não usado no novo dashboard.
export const enviarRedacao = (formData) =>
  api.post('/redacoes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r?.data?.data ?? r?.data ?? r);

export const listarRedacoes = async (status, filters = {}) => {
  // Mapeia status legados para rotas compat
  const path = status === 'pendente' ? '/redacoes/pendentes' : '/redacoes/corrigidas';
  const r = await api.get(path, { params: { ...filters } });
  const data = r?.data?.data ?? r?.data ?? [];
  // Adapta para a forma esperada pelo Dashboard: { redacoes: [...] }
  return { redacoes: Array.isArray(data) ? data : [] };
};

export const listarPendentes = (filters = {}) =>
  listarRedacoes('pendente', filters);

export const listarCorrigidas = (filters = {}) =>
  listarRedacoes('corrigida', filters);

export const listarRedacoesAluno = () =>
  api.get('/essays', { params: { status: 'GRADED' } }).then((r) => r?.data?.data ?? r?.data ?? r);

export const corrigirRedacao = (id, payload) =>
  api.post(`/redacoes/${id}/corrigir`, payload, {
    headers: { 'Content-Type': 'application/json' },
  }).then((r) => r?.data?.data ?? r?.data ?? r);

export const reenviarPdf = (id, to) =>
  api.post(`/redacoes/${id}/enviar-pdf`, to ? { to } : {}).then((r) => r?.data?.data ?? r?.data ?? r);

export default {
  enviarRedacao,
  listarRedacoes,
  listarPendentes,
  listarCorrigidas,
  listarRedacoesAluno,
  corrigirRedacao,
  reenviarPdf,
};

