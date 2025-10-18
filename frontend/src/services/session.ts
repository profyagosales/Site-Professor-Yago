import api from './api';

export type SessionUser = {
  _id?: string | null;
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: 'teacher' | 'student' | string | null;
  isTeacher?: boolean;
  photoUrl?: string | null;
  [key: string]: unknown;
};

export type SessionPayload = {
  success?: boolean;
  message?: string;
  role: string;
  isTeacher: boolean;
  user: SessionUser;
  token?: string;
};

export async function fetchMe(silent = true): Promise<SessionUser | null> {
  try {
    const { data } = await api.get<SessionPayload>('/auth/me', {
      meta: { skipAuthRedirect: silent, noCache: true },
    });
    return data?.user ?? null;
  } catch (e: any) {
    if (silent && e?.response?.status === 401) return null;
    throw e;
  }
}

export const getMe = fetchMe;

export async function loginTeacher(email: string, password: string): Promise<SessionPayload> {
  const loginResponse = await api.post<SessionPayload>(
    '/auth/login-teacher',
    { email, password },
    { meta: { skipAuthRedirect: true } }
  );

  const { data } = await api.get<SessionPayload>('/auth/me', {
    meta: { skipAuthRedirect: true, noCache: true },
  });

  if (data.role !== 'teacher' || !data.isTeacher) {
    throw new Error('perfil inválido');
  }

  return data;
}

export async function loginStudent(email: string, password: string): Promise<SessionPayload> {
  const loginResponse = await api.post<SessionPayload>(
    '/auth/login-student',
    { email, password },
    { meta: { skipAuthRedirect: true } }
  );

  const { data } = await api.get<SessionPayload>('/auth/me', {
    meta: { skipAuthRedirect: true, noCache: true },
  });

  if (data.role !== 'student') {
    throw new Error('perfil inválido');
  }

  return data;
}

export async function doLogout(): Promise<void> {
  try {
    await api.post('/auth/logout', undefined, {
      meta: { skipAuthRedirect: true, noCache: true },
    });
  } catch {}
}
