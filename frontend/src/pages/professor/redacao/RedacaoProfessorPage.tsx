import { useEffect, useMemo, useState } from 'react';
import { useEssays } from '@/hooks/useEssays';
// import GradeModal from '@/components/redacao/GradeModal';
import { reenviarPdf } from '@/services/redacoes';
import { toast } from 'react-toastify';
import NewEssayModal from '@/components/redacao/NewEssayModal';
import { Page } from '@/components/Page';
import { listClasses } from '@/services/classes';
import ThemesManager from '@/components/redacao/ThemesManager';

export default function RedacaoProfessorPage() {
  const { status, setStatus, q, setQ, classId, setClassId, page, setPage, pageSize, setPageSize, data, loading, error, reload, extra, setExtra } = useEssays('pending');
  // const [modal, setModal] = useState<{ id: string; fileUrl?: string; type?: 'ENEM'|'PAS' } | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const [bimester, setBimester] = useState<string>('');
  const [type, setType] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const res = await listClasses();
        const arr = Array.isArray(res?.data) ? res.data : res?.data?.data || res || [];
        setClasses(arr);
      } catch {}
    })();
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.total || 0) / pageSize)), [data?.total, pageSize]);

  return (
    <Page title="Redação" subtitle="Gerencie as redações dos alunos">
      {/* Ações topo direito */}
      <div className="mb-2 flex items-center justify-end gap-2">
        <button className="rounded-lg border border-[#E5E7EB] px-4 py-2 font-semibold hover:bg-[#F3F4F6]" onClick={() => setThemesOpen(true)}>Temas</button>
        <button className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:brightness-110" onClick={() => setNewOpen(true)}>Nova Redação</button>
      </div>
      {/* Abas */}
      <div className="mb-4 flex gap-2">
        <button
          className={`rounded-full border px-4 py-2 text-sm ${status === 'pending' ? 'bg-orange-500 text-white' : 'border-[#E5E7EB] text-[#111827]'}`}
          onClick={() => { setStatus('pending'); setPage(1); }}
        >Pendentes</button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${status === 'corrected' ? 'bg-orange-500 text-white' : 'border-[#E5E7EB] text-[#111827]'}`}
          onClick={() => { setStatus('corrected'); setPage(1); }}
        >Corrigidas</button>
      </div>

      {/* Filtros */}
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Buscar aluno"
          className="rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <select
          value={classId || ''}
          onChange={(e) => { setClassId(e.target.value || undefined); setPage(1); }}
          className="rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Todas as turmas</option>
          {classes.map((c: any) => (
            <option key={c._id || c.id} value={c._id || c.id}>
              {`${c.series || ''}${c.letter || ''}`} {c.discipline ? `— ${c.discipline}` : ''}
            </option>
          ))}
        </select>
        <select
          value={bimester}
          onChange={(e)=> { const v = e.target.value; setBimester(v); setExtra({ ...extra, bimester: v || undefined }); setPage(1); }}
          className="rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Todos os bimestres</option>
          <option value="1">1º</option>
          <option value="2">2º</option>
          <option value="3">3º</option>
          <option value="4">4º</option>
        </select>
        <select
          value={type}
          onChange={(e)=> { const v = e.target.value; setType(v); setExtra({ ...extra, type: v || undefined }); setPage(1); }}
          className="rounded-lg border border-[#E5E7EB] p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Todos os tipos</option>
          <option value="PAS">PAS</option>
          <option value="ENEM">ENEM</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-ys-md">
        <table className="w-full text-sm text-[#111827]">
          <thead className="bg-[#F3F4F6] text-left text-[#374151]">
            <tr>
              <th className="px-4 py-3 font-semibold">Aluno</th>
              <th className="px-4 py-3 font-semibold">Turma</th>
              <th className="px-4 py-3 font-semibold">Tema</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Bimestre</th>
              <th className="px-4 py-3 font-semibold">Enviado em</th>
              {status === 'pending' ? (
                <th className="px-4 py-3 font-semibold">Arquivo</th>
              ) : (
                <>
                  <th className="px-4 py-3 font-semibold">Nota</th>
                  <th className="px-4 py-3 font-semibold">Comentários</th>
                  <th className="px-4 py-3 font-semibold">Arquivo</th>
                </>
              )}
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {loading && (
              <tr><td className="px-4 py-4 text-ys-ink-2" colSpan={7}>Carregando…</td></tr>
            )}
            {!loading && data?.items?.length === 0 && (
              <tr><td className="px-4 py-4 text-ys-ink-2" colSpan={7}>Sem redações {status === 'pending' ? 'pendentes' : 'corrigidas'}.</td></tr>
            )}
            {!loading && data?.items?.map((e) => (
              <tr key={e.id} className="odd:bg-[#F9FAFB]">
                <td className="px-4 py-3">{e.studentName}</td>
                <td className="px-4 py-3">{e.className}</td>
                <td className="px-4 py-3">{e.topic}</td>
                <td className="px-4 py-3">{(e as any).type || '-'}</td>
                <td className="px-4 py-3">{(e as any).bimester ?? '-'}</td>
                <td className="px-4 py-3">{new Date(e.submittedAt).toLocaleDateString()}</td>
        {status === 'pending' ? (
                  <td className="px-4 py-3"><a className="text-orange-600 underline" href={e.fileUrl} target="_blank" rel="noreferrer">Abrir</a></td>
                ) : (
                  <>
                    <td className="px-4 py-3">{e.score ?? '-'}</td>
                    <td className="px-4 py-3">{e.comments ?? '-'}</td>
          <td className="px-4 py-3"><a className="text-orange-600 underline" href={e.fileUrl} target="_blank" rel="noreferrer">Abrir</a></td>
                  </>
                )}
                <td className="px-4 py-3">
                  {status === 'pending' ? (
                    <a
                      className="rounded-lg bg-orange-500 px-3 py-1.5 text-white hover:brightness-110"
                      href={`/professor/redacao/${e.id}`}
                    >Corrigir</a>
                  ) : (
                    <div className="flex items-center gap-2">
                      <a className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 hover:bg-[#F3F4F6]" href={e.fileUrl} target="_blank" rel="noreferrer">Ver PDF</a>
                      <button
                        className="rounded-lg bg-orange-500 px-3 py-1.5 text-white hover:brightness-110"
                        onClick={async ()=>{
                          try { await reenviarPdf(e.id); toast.success('PDF reenviado'); } catch (err:any) { toast.error(err?.response?.data?.message || 'Falha ao reenviar'); }
                        }}
                      >Reenviar PDF</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="rounded border border-[#E5E7EB] px-3 py-1 disabled:opacity-50"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >Anterior</button>
          <span className="text-sm text-ys-ink-2">Página {page} de {totalPages}</span>
          <button
            className="rounded border border-[#E5E7EB] px-3 py-1 disabled:opacity-50"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >Próxima</button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>Tamanho:</span>
          <select
            className="rounded border border-[#E5E7EB] p-1"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {[10, 20, 50].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

  {/* GradeModal substituído por workspace de correção em página dedicada */}
      <NewEssayModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={() => { setStatus('pending'); setPage(1); reload(); }}
      />
  <ThemesManager open={themesOpen} onClose={() => setThemesOpen(false)} />
    </Page>
  );
}
