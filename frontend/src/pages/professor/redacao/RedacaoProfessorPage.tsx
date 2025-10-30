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
  // helpers visuais/layout
  const pickAvatarUrl = (row: any): string | undefined => {
    const candidates = [
      row?.studentAvatar,
      row?.avatarUrl,
      row?.student?.avatarUrl,
      row?.student?.avatar,
      row?.student?.photoUrl,
      row?.studentPhoto,
    ];
    const url = candidates.find((u) => typeof u === 'string' && u.trim());
    return url ? String(url) : undefined;
  };
  const getInitials = (name?: string): string => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => (p[0] ? p[0].toUpperCase() : '')).join('') || '??';
  };

  const normalizeStatus = (status?: string) => {
    const raw = (status ?? '').toString().trim().toLowerCase();
    if (!raw) return '';
    if (raw === 'graded' || raw === 'ready' || raw === 'corrected' || raw === 'corrigida' || raw === 'corrigido') return 'graded';
    if (raw === 'uploaded' || raw === 'pending' || raw === 'enviada') return 'pending';
    return raw;
  };

  const statusLabel = (status?: string) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'graded':
        return 'Corrigida';
      case 'pending':
        return 'Pendente';
      default:
        return status || '—';
    }
  };

  const statusTooltip = (status?: string) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'graded':
        return 'Correção finalizada. PDF disponível para consulta.';
      case 'pending':
        return 'Enviada e aguardando correção.';
      default:
        return (status || '').toString();
    }
  };

  const statusClass = (status?: string) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'pending':
        return 'bg-yellow-200 text-yellow-800';
      case 'graded':
        return 'bg-green-200 text-green-800';
      default:
        return 'bg-gray-200 text-black';
    }
  };

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
      key: 'graded',
      label: 'Corrigidas',
      isActive: status === 'graded',
      onClick: () => {
        setStatus('graded');
        setPage(1);
      },
    },
  ];
  const columnsCount = status === 'pending' ? 10 : 11;

  return (
    <Page title="Redação" subtitle="Gerencie as redações dos alunos">
      <div className="space-y-4" style={{ width: '100%', marginInline: 0, paddingInline: '16px' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setThemesOpen(true)}>
            Temas
          </Button>
          <Button size="sm" onClick={() => setModalConfig({ mode: 'create' })}>
            Nova Redação
          </Button>
        </div>

        <Tabs items={statusTabs} className="tabs-compact" />

        <div className="filters-grid">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar aluno"
            className="filter-control"
          />
          <select
            value={classId || ''}
            onChange={(e) => {
              setClassId(e.target.value || undefined);
              setPage(1);
            }}
            className="filter-control"
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
            onChange={(e) => {
              const v = e.target.value;
              setBimester(v);
              setExtra({ ...extra, bimester: v || undefined });
              setPage(1);
            }}
            className="filter-control"
          >
            <option value="">Todos os bimestres</option>
            <option value="1">1º</option>
            <option value="2">2º</option>
            <option value="3">3º</option>
            <option value="4">4º</option>
          </select>
          <select
            value={type}
            onChange={(e) => {
              const v = e.target.value;
              setType(v);
              setExtra({ ...extra, type: v || undefined });
              setPage(1);
            }}
            className="filter-control"
          >
            <option value="">Todos os tipos</option>
            <option value="PAS">PAS</option>
            <option value="ENEM">ENEM</option>
          </select>
        </div>

        <div
          className="table-card--wide overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-ys-md"
          style={{
            position: 'relative',
            left: '50%',
            right: '50%',
            marginLeft: 'calc(-50vw + 16px)',
            marginRight: 'calc(-50vw + 16px)',
            width: 'calc(100vw - 32px)',
            maxWidth: 'none',
          }}
        >
          <div className="table-wide-wrap" style={{ maxWidth: '100%', overflowX: 'auto' }}>
            <table className="table-wide text-sm text-[#111827]">
              <colgroup>
                <col className="col-avatar" />
                <col className="col-student" />
                <col className="col-class" />
                <col className="col-theme" />
                <col className="col-type" />
                <col className="col-bimester" />
                <col className="col-date" />
                <col className="col-status" />
                {status === 'pending' ? (
                  <col className="col-file" />
                ) : (
                  <>
                    <col className="col-score" />
                    <col className="col-file" />
                  </>
                )}
                <col className="col-actions" />
              </colgroup>
              <thead className="bg-[#F3F4F6] text-[#374151]">
                <tr className="align-middle">
                  <th className="col-avatar px-3 py-3 font-semibold" />
                  <th className="col-student px-4 py-3 font-semibold">Aluno</th>
                  <th className="col-class px-4 py-3 font-semibold">Turma</th>
                  <th className="col-theme px-4 py-3 font-semibold">Tema</th>
                  <th className="col-type px-4 py-3 font-semibold">Tipo</th>
                  <th className="col-bimester px-4 py-3 font-semibold">Bimestre</th>
                  <th className="col-date px-4 py-3 font-semibold">Enviado em</th>
                  <th className="col-status px-4 py-3 font-semibold">Status</th>
                  {status === 'pending' ? (
                    <th className="col-file px-4 py-3 font-semibold">Arquivo</th>
                  ) : (
                    <>
                      <th className="col-score px-4 py-3 font-semibold">Nota</th>
                      <th className="col-file px-4 py-3 font-semibold">Visualizar</th>
                    </>
                  )}
                  <th className="col-actions px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F3F4F6]">
            {loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-slate-500 whitespace-normal" colSpan={columnsCount}>
                  Carregando…
                </td>
              </tr>
            )}

            {!loading &&
              (() => {
                const all = Array.isArray(data?.items) ? (data!.items as any[]) : [];
                // Predicado robusto: considera status, flags, URLs e finalPdfUrl
                const isRowCorrected = (row: any) => {
                  const normalized = String(row?.status || '').toLowerCase();
                  return Boolean(
                    row?.isCorrected ||
                    row?.correctionPdf ||
                    row?.correctedUrl ||
                    row?.finalPdfUrl ||
                    normalized === 'graded' ||
                    normalized === 'ready' ||
                    normalized === 'corrigida' ||
                    normalized === 'corrigido'
                  );
                };
                const filtered = all.filter((row) =>
                  status === 'pending' ? !isRowCorrected(row) : isRowCorrected(row),
                );

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td className="px-4 py-4 text-sm text-slate-500 whitespace-normal" colSpan={columnsCount}>
                        Sem redações {status === 'pending' ? 'pendentes' : 'corrigidas'}.
                      </td>
                    </tr>
                  );
                }

                return filtered.map((e) => {
                  const rawId = (e as any)?._id ?? (e as any)?.id ?? null;
                  const essayId = typeof rawId === 'string' && rawId.trim() ? rawId : null;
                  if (!essayId) {
                    console.warn('Redação sem identificador válido para correção.', e);
                  }
                  const correctionUrl = essayId ? `/professor/redacao/${essayId}` : null;
                  const correctedCandidates: (string | undefined)[] = [
                    (e as any)?.correctionPdf, // **novo** campo normalizado
                    (e as any)?.correctedUrl,
                    (e as any)?.correctedPdfUrl,
                    (e as any)?.correctionPdfUrl,
                    (e as any)?.finalPdfUrl,
                    (e as any)?.raw?.correctedUrl,
                  ];
                  const correctedPdfUrl = (
                    correctedCandidates.find((url) => typeof url === 'string' && url.trim()) as
                      | string
                      | undefined
                  )?.trim();
                  const openCorrectedPdf = async () => {
                    if (!essayId) return;
                    if (correctedPdfUrl) {
                      window.open(correctedPdfUrl, '_blank', 'noopener');
                      return;
                    }
                    try {
                      const url = await fetchEssayPdfUrl(essayId);
                      window.open(url, '_blank', 'noopener');
                    } catch (err) {
                      toast.error('Não foi possível abrir o PDF corrigido.');
                    }
                  };

                  return (
                    <tr key={essayId ?? `${e.studentName}-${e.submittedAt}`} className="odd:bg-[#F9FAFB] align-middle">
                      {/* avatar */}
                      <td className="col-avatar px-3 py-2.5">
                        {(() => {
                          const url = pickAvatarUrl(e);
                          const initials = getInitials(e.studentName);
                          if (url) {
                            return (
                              <img
                                src={url}
                                alt={e.studentName || 'Aluno'}
                                className="h-6 w-6 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            );
                          }
                          return (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B] text-[10px] font-semibold text-white">
                              {initials}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="col-student px-4 py-3">
                        <span className="ellipsis-cell" title={e.studentName || '-'}>
                          {e.studentName}
                        </span>
                      </td>
                      <td className="col-class px-4 py-3">
                        <span className="ellipsis-cell" title={e.className ?? '-'}>
                          {e.className ?? '-'}
                        </span>
                      </td>

                      <td className="col-theme px-4 py-3">
                        <span
                          className="ellipsis-cell"
                          title={String((e as any).theme ?? (e as any).topic ?? '-')}
                        >
                          {(e as any).theme ?? (e as any).topic ?? '-'}
                        </span>
                      </td>

                      <td className="col-type px-4 py-3 text-center">{(e as any).type || '-'}</td>
                      <td className="col-bimester px-4 py-3 text-center">{(e as any).bimester ?? '-'}</td>
                      <td className="col-date px-4 py-3 text-center">
                        {e.submittedAt ? new Date(e.submittedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="col-status px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs ${statusClass((e as any).status)}`}
                          title={statusTooltip((e as any).status)}
                        >
                          {statusLabel((e as any).status)}
                        </span>
                      </td>

                      {status === 'pending' ? (
                        <td className="col-file px-4 py-3 text-center">
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
                          <td className="col-score px-4 py-3 text-center">{(e as any).score ?? '-'}</td>
                          <td className="col-file px-4 py-3 text-center">
                            <Button type="button" variant="ghost" size="sm" onClick={openCorrectedPdf} disabled={!essayId}>
                              Visualizar
                            </Button>
                          </td>
                        </>
                      )}

                      <td className="col-actions px-4 py-3">
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
                          ) : null}

                          {status === 'graded' && (
                            <Button
                              size="sm"
                              onClick={() => correctionUrl && navigate(correctionUrl)}
                              disabled={!correctionUrl}
                              title={correctionUrl ? undefined : 'Identificador ausente'}
                            >
                              Recorrigir
                            </Button>
                          )}

                          {status === 'graded' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!essayId) {
                                  console.warn('Não foi possível reenviar PDF: redação sem identificador.', e);
                                  return;
                                }
                                try {
                                  await reenviarPdf(essayId);
                                  toast.success('PDF corrigido reenviado.');
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.message || 'Falha ao reenviar PDF.');
                                }
                              }}
                              disabled={!essayId}
                            >
                              Reenviar PDF
                            </Button>
                          )}

                          {status === 'pending' && (
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
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.message || 'Erro ao carregar redação.');
                                } finally {
                                  setEditLoadingId(null);
                                }
                              }}
                              disabled={!essayId || editLoadingId === essayId || deletingId === essayId}
                            >
                              {editLoadingId === essayId ? 'Carregando…' : 'Editar'}
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={async () => {
                              if (!essayId) return;
                              const confirmed = window.confirm(
                                'Deseja realmente excluir esta redação? Esta ação não pode ser desfeita.',
                              );
                              if (!confirmed) return;
                              try {
                                setDeletingId(essayId);
                                await deleteEssay(essayId);
                                toast.success('Redação excluída.');
                                reload();
                              } catch (err: any) {
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
                  );
                });
              })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginação */}
        <div className="table-footer">
          <div className="table-pagination">
            <button
              className="pagination-btn"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              Anterior
            </button>
            <span className="text-sm text-ys-ink-2">
              Página {page} de {totalPages}
            </span>
            <button
              className="pagination-btn"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Próxima
            </button>
          </div>
          <div className="table-page-size">
            <span>Tamanho:</span>
            <select
              className="rounded border border-[#E5E7EB] p-1"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
