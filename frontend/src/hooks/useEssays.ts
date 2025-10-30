import { useEffect, useState } from 'react';
import { fetchEssays } from '@/services/essays.service';
import type { EssayStatus, EssaysPage } from '@/types/redacao';

const PAGE_SIZE_KEY = 'ys.pageSize.essays';

export function useEssays(initialStatus: EssayStatus) {
  const [status, setStatus] = useState<EssayStatus>(initialStatus);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      const raw = localStorage.getItem(PAGE_SIZE_KEY);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) && n > 0 ? n : 20;
    } catch {
      return 20;
    }
  });
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
      const normalizedStatus = (String(status).toLowerCase() as EssayStatus);
      const trimmedQ = q.trim();

      if ((import.meta as any).env?.VITE_MOCK === '1') {
        const { getMockPage } = await import('@/mocks/essays');
        setData(getMockPage({ status: normalizedStatus, page, pageSize, q: trimmedQ, classId }));
        return;
      }
      const res = await fetchEssays({ status: normalizedStatus, page, pageSize, q: trimmedQ, classId, bimester: extra.bimester, type: extra.type });
      setData(res as EssaysPage);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        setError('Sessão expirada. Faça login para visualizar as redações.');
      } else {
        setError(e?.response?.data?.message ?? 'Erro ao carregar redações');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status, page, pageSize, q, classId, extra.bimester, extra.type]);

  useEffect(() => {
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
    } catch {}
  }, [pageSize]);

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
