import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEssays } from '@/hooks/useEssays';
import { fetchEssayPdfUrl, fetchEssayById, deleteEssay } from '@/services/essays.service';
// import GradeModal from '@/components/redacao/GradeModal';
// @ts-expect-error serviço legado em JS
import { reenviarPdf } from '@/services/redacoes';
import { toast } from 'react-toastify';
import NewEssayModal from '@/components/redacao/NewEssayModal';
import { Page } from '@/components/Page';
import { listClasses } from '@/services/classes';
import ThemesManager from '@/components/redacao/ThemesManager';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';

export default function RedacaoProfessorPage() {
  const { status, setStatus, q, setQ, classId, setClassId, page, setPage, pageSize, setPageSize, data, loading, error, reload, extra, setExtra } = useEssays('pending');
  // const [modal, setModal] = useState<{ id: string; fileUrl?: string; type?: 'ENEM'|'PAS' } | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [modalConfig, setModalConfig] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; essayId: string; data: any }
    | null
  >(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [themesOpen, setThemesOpen] = useState(false);
  const [bimester, setBimester] = useState<string>('');
  const [type, setType] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await listClasses();
        const arr = Array.isArray(res) ? (res as any[]) : [];
        setClasses(arr);
      } catch {}
    })();
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.total || 0) / pageSize)), [data?.total, pageSize]);
  const statusTabs = [
    {
      key: 'pending',
      label: 'Pendentes',
      isActive: status === 'pending',
      onClick: () => {
        setStatus('pending');
        setPage(1);
      },
    },
    {
      key: 'corrected',
      label: 'Corrigidas',
      isActive: status === 'corrected',
      onClick: () => {
        setStatus('corrected');
        setPage(1);
      },
    },
  ];

  return (
    <Page title="Redação" subtitle="Gerencie as redações dos alunos">
      {/* Ações topo direito */}
      <div className="mb-2 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={() => setThemesOpen(true)}>
          Temas
        </Button>
        <Button onClick={() => setModalConfig({ mode: 'create' })}>
          Nova Redação
        </Button>
      </div>
      {/* Abas */}
      <Tabs items={statusTabs} className="mb-4" />

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
            {!loading && data?.items?.map((e) => {
              const rawId = (e as any)?._id ?? (e as any)?.id ?? null;
              const essayId = typeof rawId === 'string' && rawId.trim() ? rawId : null;
              if (!essayId) {
                console.warn('Redação sem identificador válido para correção.', e);
              }
              const correctionUrl = essayId ? `/professor/redacao/${essayId}` : null;
              return (
              <tr key={essayId ?? `${e.studentName}-${e.submittedAt}`} className="odd:bg-[#F9FAFB]">
                <td className="px-4 py-3">{e.studentName}</td>
                <td className="px-4 py-3">{e.className ?? '-'}</td>
                <td className="px-4 py-3">{(e as any).theme ?? (e as any).topic ?? '-'}</td>
                <td className="px-4 py-3">{(e as any).type || '-'}</td>
                <td className="px-4 py-3">{(e as any).bimester ?? '-'}</td>
                <td className="px-4 py-3">{e.submittedAt ? new Date(e.submittedAt).toLocaleDateString() : '-'}</td>
                {status === 'pending' ? (
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!essayId) return;
                        try {
                          const url = await fetchEssayPdfUrl(essayId);
                          window.open(url, '_blank', 'noopener');
                        } catch (err) {
                          toast.error('Não foi possível abrir o PDF.');
                        }
                      }}
                      disabled={!essayId}
                    >
                      Ver PDF
                    </Button>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3">{(e as any).score ?? '-'}</td>
                    <td className="px-4 py-3">{(e as any).comments ?? '-'}</td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!essayId) return;
                          try {
                            const url = await fetchEssayPdfUrl(essayId);
                            window.open(url, '_blank', 'noopener');
                          } catch (err) {
                            toast.error('Não foi possível abrir o PDF.');
                          }
                        }}
                        disabled={!essayId}
                      >
                        Ver PDF
                      </Button>
                    </td>
                  </>
                )}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {status === 'pending' ? (
                      <Button
                        size="sm"
                        onClick={() => correctionUrl && navigate(correctionUrl)}
                        disabled={!correctionUrl}
                        title={correctionUrl ? undefined : 'Identificador ausente'}
                      >
                        Corrigir
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!essayId) return;
                          try {
                            const url = await fetchEssayPdfUrl(essayId);
                            window.open(url, '_blank', 'noopener');
                          } catch (err) {
                            toast.error('Não foi possível abrir o PDF.');
                          }
                        }}
                        disabled={!essayId}
                      >
                        Ver PDF
                      </Button>
                    )}
                    {status === 'corrected' && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!essayId) {
                            console.warn('Não foi possível reenviar PDF: redação sem identificador.', e);
                            return;
                          }
                          try {
                            await reenviarPdf(essayId);
                            toast.success('PDF reenviado');
                          } catch (err:any) {
                            toast.error(err?.response?.data?.message || 'Falha ao reenviar');
                          }
                        }}
                        disabled={!essayId}
                      >
                        Reenviar PDF
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!essayId) return;
                        try {
                          setEditLoadingId(essayId);
                          const data = await fetchEssayById(essayId);
                          setModalConfig({ mode: 'edit', essayId, data });
                        } catch (err:any) {
                          toast.error(err?.response?.data?.message || 'Erro ao carregar redação.');
                        } finally {
                          setEditLoadingId(null);
                        }
                      }}
                      disabled={!essayId || editLoadingId === essayId || deletingId === essayId}
                    >
                      {editLoadingId === essayId ? 'Abrindo…' : 'Editar'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={async () => {
                        if (!essayId) return;
                        const confirmed = window.confirm('Deseja realmente excluir esta redação? Esta ação não pode ser desfeita.');
                        if (!confirmed) return;
                        try {
                          setDeletingId(essayId);
                          await deleteEssay(essayId);
                          toast.success('Redação excluída.');
                          reload();
                        } catch (err:any) {
                          toast.error(err?.response?.data?.message || 'Erro ao excluir redação.');
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      disabled={!essayId || deletingId === essayId || editLoadingId === essayId}
                    >
                      {deletingId === essayId ? 'Excluindo…' : 'Excluir'}
                    </Button>
                  </div>
                </td>
              </tr>
            );})}
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
        open={modalConfig !== null}
        mode={modalConfig?.mode || 'create'}
        essayId={modalConfig && modalConfig.mode === 'edit' ? modalConfig.essayId : undefined}
        initialEssay={modalConfig && modalConfig.mode === 'edit' ? modalConfig.data : undefined}
        onClose={() => setModalConfig(null)}
        onSuccess={() => {
          if (modalConfig?.mode === 'create') {
            setStatus('pending');
            setPage(1);
          }
          reload();
        }}
      />
  <ThemesManager open={themesOpen} onClose={() => setThemesOpen(false)} />
    </Page>
  );
}
