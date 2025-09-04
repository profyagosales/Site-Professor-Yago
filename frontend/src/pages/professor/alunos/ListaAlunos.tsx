import { Page } from '@/components/Page';
import { useEffect, useState } from 'react';
import { searchStudents } from '@/services/students2';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes';

export default function ListaAlunos() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await searchStudents({ q, page, pageSize });
        if (!alive) return;
        setData(r);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.response?.data?.message || 'Erro ao carregar');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [q, page, pageSize]);

  return (
    <Page title='Alunos' subtitle='Buscar e visualizar perfis.'>
      <div className='mb-3 flex items-center gap-2'>
        <input
          value={q}
          onChange={e => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder='Buscar aluno'
          className='rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
        />
      </div>
      {err && <p className='text-red-600 mb-2'>{err}</p>}
      {loading ? (
        <p>Carregando…</p>
      ) : (
        <div className='overflow-hidden rounded-xl border border-[#E5E7EB] bg-white'>
          <table className='w-full text-sm text-[#111827]'>
            <thead className='bg-[#F3F4F6] text-left text-[#374151]'>
              <tr>
                <th className='px-4 py-3'>Aluno</th>
                <th className='px-4 py-3'>E-mail</th>
                <th className='px-4 py-3'>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s: any) => (
                <tr key={s._id || s.id} className='odd:bg-[#F9FAFB]'>
                  <td className='px-4 py-3'>{s.name}</td>
                  <td className='px-4 py-3'>{s.email}</td>
                  <td className='px-4 py-3'>
                    <button
                      className='rounded-lg bg-orange-500 px-3 py-1.5 text-white'
                      onClick={() =>
                        nav(ROUTES.prof.alunoPerfil(s._id || s.id))
                      }
                    >
                      Ver perfil
                    </button>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td className='px-4 py-3 text-ys-ink-2' colSpan={3}>
                    Sem resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className='mt-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <button
            className='rounded border border-[#E5E7EB] px-3 py-1 disabled:opacity-50'
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className='text-sm text-ys-ink-2'>Página {page}</span>
          <button
            className='rounded border border-[#E5E7EB] px-3 py-1 disabled:opacity-50'
            disabled={page * pageSize >= data.total}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima
          </button>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span>Tamanho:</span>
          <select
            className='rounded border border-[#E5E7EB] p-1'
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50].map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Page>
  );
}
