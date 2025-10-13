import { api } from './api';

export type ClassItem = {
  _id: string;
  series?: number;
  letter?: string;
  discipline?: string;
  schedule?: any;
  students?: any[];
  teachers?: any[];
};

export async function listProfessorClasses() {
  const res = await api.get('/professor/classes', {
    meta: { noCache: true } as any, // evita 304/cache preso
    validateStatus: () => true,
  } as any);

  if (res.status === 401) {
    // aqui mantemos o redirecionamento padrão (feito no interceptor),
    // portanto só retornamos vazio se alguém chamar com noAuthRedirect.
    return [];
  }

  // a API costuma responder { success, message, data: [...] }
  const data = (res.data?.data ?? res.data ?? []) as ClassItem[];
  return Array.isArray(data) ? data : [];
}
