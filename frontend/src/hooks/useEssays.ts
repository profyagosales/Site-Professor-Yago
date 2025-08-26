import { useEffect, useState } from 'react';
import { fetchEssays } from '@/services/essays.service';
import type { EssayStatus, EssaysPage } from '@/types/redacao';

export function useEssays(initialStatus: EssayStatus) {
  const [status, setStatus] = useState<EssayStatus>(initialStatus);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState('');
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [extra, setExtra] = useState<{ bimester?: string; type?: string }>({});

  const [data, setData] = useState<EssaysPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      if ((import.meta as any).env?.VITE_MOCK === '1') {
        const { getMockPage } = await import('@/mocks/essays');
        setData(getMockPage({ status, page, pageSize, q, classId }));
        return;
      }
      const res = await fetchEssays({ status, page, pageSize, q, classId });
      // filtro leve no cliente enquanto o servidor não pagina por bimestre/tipo
      const f = (arr: any[]) => arr.filter((it: any) => {
        if (extra.bimester && String(it.bimester) !== extra.bimester) return false;
        if (extra.type && String(it.type) !== extra.type) return false;
        return true;
      });
      setData({ ...res, items: f(res.items as any) } as any);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao carregar redações');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status, page, pageSize, q, classId]);

  return {
    status, setStatus,
    page, setPage,
    pageSize, setPageSize,
    q, setQ,
    classId, setClassId,
  data, loading, error,
  extra, setExtra,
    reload: load,
  };
}

export default useEssays;
