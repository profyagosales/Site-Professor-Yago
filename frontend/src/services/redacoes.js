import { api, pickData } from '@/lib/api';

export const enviarRedacao = (formData) =>
  api
    .post('/redacoes/enviar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(pickData);

export const listarRedacoes = (status, filters = {}) =>
  api
    .get('/redacoes/professor', { params: { status, ...filters } })
    .then(pickData);

export const listarPendentes = (filters = {}) =>
  listarRedacoes('pendente', filters);

export const listarCorrigidas = (filters = {}) =>
  listarRedacoes('corrigida', filters);

export const listarRedacoesAluno = () =>
  api.get('/redacoes').then(pickData);

export const corrigirRedacao = (id, payload) =>
  api
    .post(`/redacoes/${id}/corrigir`, payload, {
      headers: { 'Content-Type': 'application/json' },
    })
    .then(pickData);

export default {
  enviarRedacao,
  listarRedacoes,
  listarPendentes,
  listarCorrigidas,
  listarRedacoesAluno,
  corrigirRedacao,
};

