import { api } from './api';
import { gerencialApi } from './gerencialApi';

export type GerencialLoginResponse = {
  success?: boolean;
  message?: string;
  token: string;
  expiresIn: number;
};

export type GerencialTeacher = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  role: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateTeacherPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  photo?: File | null;
};

export type UpdateTeacherPayload = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  photo?: File | null;
  removePhoto?: boolean;
};

function normalizeTeacher(input: any): GerencialTeacher {
  return {
    id: String(input?.id || input?._id || ''),
    name: input?.name ?? '',
    email: input?.email ?? '',
    phone: input?.phone ?? null,
    photoUrl: input?.photoUrl ?? null,
    role: input?.role ?? 'teacher',
    createdAt: input?.createdAt ?? null,
    updatedAt: input?.updatedAt ?? null,
  };
}

function buildMultipart(body: Record<string, unknown>, file?: File | null): FormData | Record<string, unknown> {
  const shouldUseFormData = !!file;
  if (!shouldUseFormData) {
    return body;
  }
  const form = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, String(value));
  });
  if (file) {
    form.append('photo', file);
  }
  return form;
}

export async function loginGerencial(password: string): Promise<GerencialLoginResponse> {
  const res = await api.post(
    '/gerencial/login',
    { password },
    { meta: { skipAuthRedirect: true }, validateStatus: () => true } as any
  );

  if (res.status >= 200 && res.status < 300 && res.data?.token) {
    const token = String(res.data.token);
    const expiresIn = Number(res.data?.expiresIn ?? 0);
    return { token, expiresIn };
  }

  const message = res.data?.message ?? 'Senha inválida.';
  throw new Error(message);
}

export async function listGerencialTeachers(query: string): Promise<GerencialTeacher[]> {
  const res = await gerencialApi.get('/gerencial/teachers', {
    params: query ? { query } : {},
    validateStatus: () => true,
  } as any);
  if (res.status >= 200 && res.status < 300 && res.data?.success) {
    const list = Array.isArray(res.data?.data) ? res.data.data : [];
    return list.map(normalizeTeacher);
  }
  throw new Error(res.data?.message ?? 'Erro ao listar professores.');
}

export async function createGerencialTeacher(payload: CreateTeacherPayload): Promise<GerencialTeacher> {
  const { photo, ...rest } = payload;
  const body = {
    name: rest.name,
    email: rest.email,
    password: rest.password,
    phone: rest.phone ?? undefined,
  };
  const data = buildMultipart(body, photo);
  const res = await gerencialApi.post('/gerencial/teachers', data, {
    validateStatus: () => true,
  } as any);
  if (res.status >= 200 && res.status < 300 && res.data?.success) {
    return normalizeTeacher(res.data?.data);
  }
  throw new Error(res.data?.message ?? 'Erro ao criar professor.');
}

export async function updateGerencialTeacher(id: string, payload: UpdateTeacherPayload): Promise<GerencialTeacher> {
  const { photo, removePhoto, ...rest } = payload;
  const body: Record<string, unknown> = { ...rest };
  if (removePhoto) {
    body.removePhoto = 'true';
  }
  const data = buildMultipart(body, photo ?? null);
  const res = await gerencialApi.patch(`/gerencial/teachers/${id}`, data, {
    validateStatus: () => true,
  } as any);
  if (res.status >= 200 && res.status < 300 && res.data?.success) {
    return normalizeTeacher(res.data?.data);
  }
  throw new Error(res.data?.message ?? 'Erro ao atualizar professor.');
}

export async function deleteGerencialTeacher(id: string): Promise<void> {
  const res = await gerencialApi.delete(`/gerencial/teachers/${id}`, {
    validateStatus: () => true,
  } as any);
  if (res.status >= 200 && res.status < 300 && res.data?.success) {
    return;
  }
  throw new Error(res.data?.message ?? 'Erro ao remover professor.');
}
