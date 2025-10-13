// frontend/src/services/session.ts
import api from './api';

export type SessionUser = {
  _id: string;
  id?: string;
  name?: string;
  email?: string;
  role?: 'teacher' | 'student' | string;
};

export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const { data } = await api.get<{ user?: SessionUser }>('/me', {
      meta: { skipAuthRedirect: true, noCache: true },
    });
    return (data as any)?.user ?? null;
  } catch (e: any) {
    if (e?.response?.status === 401) return null;
    throw e;
  }
}

export async function doLogout(): Promise<void> {
  try {
    await api.post('/logout', undefined, {
      meta: { skipAuthRedirect: true, noCache: true },
    });
  } catch {}
}
