import { api } from './api';

export type TeacherAveragePoint = {
  bim: number;
  media: number;
};

export async function getTeacherBimesterAverages({
  ano,
  turmas,
}: {
  ano?: number;
  turmas?: string[];
}): Promise<TeacherAveragePoint[]> {
  const params: Record<string, string> = {};
  if (typeof ano === 'number' && Number.isFinite(ano)) {
    params.ano = String(ano);
  }
  if (Array.isArray(turmas) && turmas.length) {
    params.turmas = turmas.filter(Boolean).join(',');
  }

  const response = await api.get('/professor/medias-gerais', {
    params,
    meta: { noCache: true },
  });

  const payload = response?.data;
  if (Array.isArray(payload)) {
    return payload as TeacherAveragePoint[];
  }
  if (payload && Array.isArray(payload?.data)) {
    return payload.data as TeacherAveragePoint[];
  }
  if (payload?.success && Array.isArray(payload?.data?.items)) {
    return payload.data.items as TeacherAveragePoint[];
  }
  return [];
}

export default {
  getTeacherBimesterAverages,
};
